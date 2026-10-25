package com.persons.dotabuff.component

import com.persons.dotabuff.domain.DotaItem
import com.persons.dotabuff.domain.DotaMatchPage
import com.persons.dotabuff.domain.DotaMatchReference
import com.persons.dotabuff.domain.DotaPlayerMatch
import com.persons.dotabuff.exception.DotabuffException
import org.jsoup.Jsoup
import org.jsoup.nodes.Document
import org.jsoup.nodes.Element
import java.time.Instant
import java.time.format.DateTimeParseException

private val matchPath = Regex("^/matches/(\\d+)$")
private val assetKey = Regex("^[a-z0-9_-]+$")
private val durationPattern = Regex("(?<!\\d)(?:(\\d+):)?(\\d{1,2}):(\\d{2})(?!\\d)")
private const val NEUTRAL_ITEMS = ".neutral-item, .neutral-items, [data-slot=neutral]"

class DotabuffParser {
    fun matches(html: String): DotaMatchPage {
        val document = document(html)
        val rows =
            document
                .select("table tbody tr")
                .stream()
                .filter { row -> row.select("a[href^=/matches/]").isNotEmpty() }
                .toList()
        if (rows.isEmpty() &&
            document.select(".no-matches, .matches-table tbody:empty").isEmpty() &&
            !document.text().contains("No matches found", true)
        ) {
            throw DotabuffException("UNRECOGNIZED_HISTORY")
        }
        val matches =
            rows
                .stream()
                .map { row ->
                    val path =
                        row
                            .select("a[href^=/matches/]")
                            .stream()
                            .map { matchPath.matchEntire(it.attr("href")) }
                            .filter { it != null }
                            .findFirst()
                            .orElseThrow { DotabuffException("INVALID_MATCH_ID") }
                    val id =
                        path?.groupValues?.get(1)?.toLongOrNull()
                            ?: throw DotabuffException("INVALID_MATCH_ID")
                    val date =
                        row.selectFirst("time[datetime]")?.attr("datetime")
                            ?: throw DotabuffException("MISSING_MATCH_DATE")
                    DotaMatchReference(id, instant(date))
                }.distinct()
                .toList()
        val next = document.select("a[rel=next], .pagination .next:not(.disabled) a").isNotEmpty()
        return DotaMatchPage(matches, next)
    }

    fun match(
        html: String,
        accountId: Long,
        reference: DotaMatchReference,
    ): DotaPlayerMatch {
        val document = document(html)
        val row =
            document
                .select("table tbody tr")
                .stream()
                .filter {
                    it.select("a[href=/players/$accountId]").isNotEmpty()
                }.findFirst()
                .orElseThrow { DotabuffException("PLAYER_NOT_FOUND") }
        val hero =
            row.selectFirst("a[href^=/heroes/]")
                ?: throw DotabuffException("MISSING_HERO")
        val heroKey = hero.attr("href").removePrefix("/heroes/")
        if (!assetKey.matches(heroKey)) {
            throw DotabuffException("INVALID_HERO")
        }
        val table = row.closest("table") ?: throw DotabuffException("MISSING_SCOREBOARD")
        val headings =
            table
                .select("thead th")
                .stream()
                .map { it.text().trim().lowercase() }
                .toList()

        fun statistic(vararg labels: String): Int {
            val index = headings.indexOfFirst { it in labels }
            val value =
                if (index >= 0) {
                    row
                        .select("td")
                        .getOrNull(index)
                        ?.text()
                        ?.trim()
                        ?.toIntOrNull()
                } else {
                    null
                }
            if (value == null || value < 0) {
                throw DotabuffException("MISSING_STATISTIC")
            }
            return value
        }

        fun optionalStatistic(vararg labels: String): Int? {
            val index = headings.indexOfFirst { it in labels }
            if (index < 0) {
                return null
            }
            val cell = row.select("td").getOrNull(index) ?: throw DotabuffException("MISSING_STATISTIC")
            val text = cell.attr("data-value").ifBlank { cell.text() }.trim()
            if (text.isBlank() || text == "-") {
                return null
            }
            return text
                .replace(",", "")
                .replace(" ", "")
                .toIntOrNull()
                ?.takeIf { it >= 0 }
                ?: throw DotabuffException("INVALID_STATISTIC")
        }
        val team =
            when {
                row.hasClass("faction-radiant") ||
                    row.attr("data-team") == "radiant" ||
                    row.closest(".radiant, .faction-radiant") != null -> "radiant"
                row.hasClass("faction-dire") ||
                    row.attr("data-team") == "dire" ||
                    row.closest(".dire, .faction-dire") != null -> "dire"
                else -> throw DotabuffException("MISSING_TEAM")
            }
        val result = document.select(".match-result, .victory, .match-victory").text().lowercase()
        val winner =
            when {
                result.contains("radiant") -> "radiant"
                result.contains("dire") -> "dire"
                else -> throw DotabuffException("MISSING_RESULT")
            }
        val duration =
            document.selectFirst(".duration, [data-duration]")?.let {
                it.attr("data-duration").ifBlank { it.text() }
            } ?: document
                .select("dt, .label")
                .stream()
                .filter { it.text().trim().equals("Duration", true) }
                .map { it.nextElementSibling()?.text().orEmpty() }
                .findFirst()
                .orElse("")
        val heroName =
            hero.text().ifBlank {
                hero.selectFirst("img")?.attr("alt").orEmpty()
            }
        if (heroName.isBlank()) {
            throw DotabuffException("MISSING_HERO_NAME")
        }
        return DotaPlayerMatch(
            reference.matchId,
            accountId,
            reference.playedAt,
            seconds(duration),
            heroKey,
            heroName,
            winner == team,
            statistic("k", "kills"),
            statistic("d", "deaths"),
            statistic("a", "assists"),
            row
                .selectFirst(".rank-tier, .rank, [data-rank]")
                ?.let {
                    it.attr("data-rank").ifBlank { it.attr("title").ifBlank { it.text() } }
                }?.takeIf { it.isNotBlank() },
            items(row),
            heroDamage = optionalStatistic("hd", "hero damage", "damage to heroes"),
            buildingDamage = optionalStatistic("td", "tower damage", "building damage"),
            neutralItem = row.selectFirst(NEUTRAL_ITEMS)?.selectFirst("a[href^=/items/]")?.let { item(it, 6) },
            score = teamScore(document, team),
            opponentScore = teamScore(document, if (team == "radiant") "dire" else "radiant"),
        )
    }

    private fun teamScore(
        document: Document,
        team: String,
    ): Int? {
        val element =
            document.selectFirst(
                ".team-results .$team .score, .$team-score, .faction-$team .score, [data-team=$team][data-score]",
            ) ?: return null
        return element
            .attr("data-score")
            .ifBlank { element.text() }
            .trim()
            .toIntOrNull()
            ?.takeIf { it >= 0 }
            ?: throw DotabuffException("INVALID_TEAM_SCORE")
    }

    private fun document(html: String): Document {
        val document = Jsoup.parse(html)
        if (document.select("#challenge-form, .cf-challenge, #cf-challenge-running").isNotEmpty() ||
            document.title().contains("Just a moment", true) ||
            document.text().contains("profile is private", true)
        ) {
            throw DotabuffException("PROFILE_UNAVAILABLE")
        }
        return document
    }

    private fun items(row: Element): List<DotaItem> {
        val links =
            row
                .select("a[href^=/items/]")
                .stream()
                .filter { it.closest(NEUTRAL_ITEMS) == null }
                .limit(6)
                .toList()
        return links.stream().map { item(it, links.indexOf(it)) }.toList()
    }

    private fun item(
        link: Element,
        slot: Int,
    ): DotaItem {
        val key = link.attr("href").removePrefix("/items/")
        val name = link.selectFirst("img")?.attr("alt")?.ifBlank { link.attr("title") } ?: link.attr("title")
        if (!assetKey.matches(key) || name.isBlank()) {
            throw DotabuffException("INVALID_ITEM")
        }
        val clock = link.selectFirst(".item-time")?.text()?.trim()
        val acquired = clock?.takeIf { it.isNotBlank() }?.let { if (it == "0:00") 0 else seconds(it) }
        return DotaItem(key, name, slot, acquired)
    }

    private fun instant(value: String): Instant =
        try {
            Instant.parse(value)
        } catch (exception: DateTimeParseException) {
            throw DotabuffException("INVALID_MATCH_DATE", cause = exception)
        }

    private fun seconds(value: String): Int {
        val match = durationPattern.find(value) ?: throw DotabuffException("MISSING_DURATION")
        val hours = match.groupValues[1].toIntOrNull() ?: 0
        val minutes = match.groupValues[2].toInt()
        val seconds = match.groupValues[3].toInt()
        val total = hours * 3600 + minutes * 60 + seconds
        if (seconds >= 60 || total !in 1..86400) {
            throw DotabuffException("INVALID_DURATION")
        }
        return total
    }
}
