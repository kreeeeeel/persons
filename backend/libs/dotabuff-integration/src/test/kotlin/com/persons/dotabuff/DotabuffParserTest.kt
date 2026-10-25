package com.persons.dotabuff

import com.persons.dotabuff.component.DotabuffParser
import com.persons.dotabuff.domain.DotaMatchReference
import com.persons.dotabuff.exception.DotabuffException
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.time.Instant

class DotabuffParserTest {
    private val parser = DotabuffParser()
    private val time = Instant.parse("2026-10-22T10:00:00Z")

    @Test
    fun `reads dated history pagination and player result statistics items and duration`() {
        val history =
            parser.matches(
                """
                <table><tbody><tr><td><a href="/matches/123">Match</a>
                <time datetime="$time"></time></td></tr></tbody></table><a rel="next">Next</a>
                """.trimIndent(),
            )
        assertThat(history.matches).containsExactly(DotaMatchReference(123, time))
        assertThat(history.hasNext).isTrue()
        val html =
            """
            <div class="match-result">Radiant Victory</div><div class="duration">42:18</div>
            <table><thead><tr><th>Player</th><th>Hero</th><th>K</th><th>D</th><th>A</th><th>Items</th></tr></thead>
            <tbody><tr data-team="radiant"><td><a href="/players/42">Player</a></td>
            <td><a href="/heroes/juggernaut">Juggernaut</a></td><td>18</td><td>4</td><td>12</td>
            <td><a href="/items/battle-fury"><img alt="Battle Fury"></a></td></tr></tbody></table>
            """.trimIndent()
        val match = parser.match(html, 42, history.matches.single())
        assertThat(match.won).isTrue()
        assertThat(match.durationSeconds).isEqualTo(2538)
        assertThat(match.kills).isEqualTo(18)
        assertThat(match.deaths).isEqualTo(4)
        assertThat(match.assists).isEqualTo(12)
        assertThat(match.items.single().key).isEqualTo("battle-fury")
        assertThat(match.items.single().slot).isZero()
        assertThat(match.rank).isNull()
        assertThat(match.score).isNull()
        assertThat(match.opponentScore).isNull()
        assertThat(match.heroDamage).isNull()
        assertThat(match.buildingDamage).isNull()
        assertThat(match.neutralItem).isNull()
        assertThat(match.items.single().acquiredAtSeconds).isNull()
        assertThat(parser.match(html.replace("Radiant Victory", "Dire Victory"), 42, history.matches.single()).won).isFalse()
    }

    @Test
    fun `reads explicit team scores from the player's perspective and preserves zero`() {
        val html =
            """
            <div class="match-result">Dire Victory</div><div class="duration">42:18</div>
            <div class="team-results"><div class="radiant"><span class="score">0</span></div>
            <div class="dire"><span class="score">42</span></div></div>
            <table><thead><tr><th>Player</th><th>Hero</th><th>K</th><th>D</th><th>A</th></tr></thead>
            <tbody><tr data-team="dire"><td><a href="/players/42">Player</a></td>
            <td><a href="/heroes/juggernaut">Juggernaut</a></td><td>18</td><td>4</td><td>12</td>
            </tr></tbody></table>
            """.trimIndent()
        val match = parser.match(html, 42, DotaMatchReference(123, time))
        assertThat(match.score).isEqualTo(42)
        assertThat(match.opponentScore).isZero()
        val radiant = parser.match(html.replace("data-team=\"dire\"", "data-team=\"radiant\""), 42, DotaMatchReference(123, time))
        assertThat(radiant.score).isZero()
        assertThat(radiant.opponentScore).isEqualTo(42)
        assertThatThrownBy { parser.match(html.replace(">42</span>", ">-1</span>"), 42, DotaMatchReference(123, time)) }
            .isInstanceOf(DotabuffException::class.java)
    }

    @Test
    fun `reads optional damage neutral slot and explicit acquisition clocks without mixing inventories`() {
        val match =
            parser.match(
                """
                <div class="match-result">Radiant Victory</div><div class="duration">42:18</div>
                <table><thead><tr><th>Player</th><th>Hero</th><th>K</th><th>D</th><th>A</th>
                <th>HD</th><th>TD</th><th>Items</th></tr></thead>
                <tbody><tr data-team="radiant"><td><a href="/players/42">Player</a></td>
                <td><a href="/heroes/juggernaut">Juggernaut</a></td><td>18</td><td>4</td><td>12</td>
                <td>34,825</td><td>8,321</td><td>
                <span class="neutral-item"><a href="/items/telescope"><img alt="Telescope"></a></span>
                <a href="/items/battle-fury"><img alt="Battle Fury"><span class="item-time">15:24</span></a>
                </td></tr></tbody></table>
                """.trimIndent(),
                42,
                DotaMatchReference(123, time),
            )
        assertThat(match.heroDamage).isEqualTo(34825)
        assertThat(match.buildingDamage).isEqualTo(8321)
        assertThat(match.items.single().key).isEqualTo("battle-fury")
        assertThat(match.items.single().acquiredAtSeconds).isEqualTo(924)
        assertThat(match.neutralItem?.key).isEqualTo("telescope")
        assertThat(match.neutralItem?.acquiredAtSeconds).isNull()
    }

    @Test
    fun `fails explicitly for challenge private unexpected HTML and missing dates rather than returning empty history`() {
        listOf(
            "<title>Just a moment...</title>",
            "<div>profile is private</div>",
            "<table><tbody><tr><td>Layout changed</td></tr></tbody></table>",
            """<table><tbody><tr><td><a href="/matches/123">Match</a></td></tr></tbody></table>""",
        ).stream().forEach { html ->
            assertThatThrownBy { parser.matches(html) }.isInstanceOf(DotabuffException::class.java)
        }
        assertThat(parser.matches("""<div class="no-matches">No matches found</div>""").matches).isEmpty()
    }
}
