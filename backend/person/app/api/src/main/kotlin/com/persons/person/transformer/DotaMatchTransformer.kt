package com.persons.person.transformer

import com.persons.dotabuff.domain.DotaPlayerMatch
import com.persons.person.contract.dto.DotaItem
import com.persons.person.contract.dto.DotaMatch
import org.springframework.stereotype.Component
import java.net.URI
import java.time.ZoneOffset

private const val CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images"
private val heroAliases = mapOf(
    "anti-mage" to "antimage", "shadow-fiend" to "nevermore", "windranger" to "windrunner",
    "outworld-destroyer" to "obsidian_destroyer", "natures-prophet" to "furion", "zeus" to "zuus",
    "necrophos" to "necrolyte", "wraith-king" to "skeleton_king", "clockwerk" to "rattletrap",
    "lifestealer" to "life_stealer", "magnus" to "magnataur", "treant-protector" to "treant",
    "io" to "wisp", "vengeful-spirit" to "vengefulspirit", "doom" to "doom_bringer",
    "queen-of-pain" to "queenofpain", "underlord" to "abyssal_underlord", "timbersaw" to "shredder",
    "centaur-warrunner" to "centaur",
)
private val itemAliases = mapOf(
    "battle-fury" to "bfury", "scythe-of-vyse" to "sheepstick", "aghanims-scepter" to "ultimate_scepter",
    "boots-of-travel" to "travel_boots", "heart-of-tarrasque" to "heart", "blink-dagger" to "blink",
    "orchid-malevolence" to "orchid", "ghost-scepter" to "ghost",
    "manta-style" to "manta", "assault-cuirass" to "assault", "eye-of-skadi" to "skadi",
    "divine-rapier" to "rapier", "linkens-sphere" to "sphere", "vladmirs-offering" to "vladmir",
    "euls-scepter-of-divinity" to "cyclone", "boots-of-speed" to "boots", "sacred-relic" to "relic",
    "drum-of-endurance" to "ancient_janggo", "eaglesong" to "eagle",
)

@Component
class DotaMatchTransformer {
    fun convert(match: DotaPlayerMatch): DotaMatch {
        val hero = heroAliases[match.heroKey] ?: match.heroKey.replace('-', '_')
        return DotaMatch(
            id = match.matchId.toString(), hero = match.heroName, heroId = hero,
            heroIconUrl = URI("$CDN/heroes/${hero}_icon.png"),
            heroImageUrl = URI("$CDN/dota_react/heroes/$hero.png"), won = match.won,
            kills = match.kills, deaths = match.deaths, assists = match.assists,
            durationSeconds = match.durationSeconds, playedAt = match.playedAt.atOffset(ZoneOffset.UTC),
            matchUrl = URI("https://www.opendota.com/matches/${match.matchId}"), rank = match.rank,
            heroDamage = match.heroDamage, buildingDamage = match.buildingDamage,
            items = match.items.stream().map(::convertItem).toList(),
            neutralItem = match.neutralItem?.let(::convertItem),
            score = match.score, opponentScore = match.opponentScore,
        )
    }

    private fun convertItem(item: com.persons.dotabuff.domain.DotaItem): DotaItem {
        val key = itemAliases[item.key] ?: item.key.replace('-', '_')
        return DotaItem(key, item.name, URI("$CDN/dota_react/items/$key.png"), item.acquiredAtSeconds)
    }
}
