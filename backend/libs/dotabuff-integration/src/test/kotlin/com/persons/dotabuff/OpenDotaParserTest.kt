package com.persons.dotabuff

import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.dotabuff.component.OpenDotaParser
import com.persons.dotabuff.domain.DotaMatchReference
import com.persons.dotabuff.exception.DotabuffException
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.time.Instant

class OpenDotaParserTest {
    private val parser = OpenDotaParser(ObjectMapper())
    private val reference = DotaMatchReference(123, Instant.ofEpochSecond(1792685540))
    private val catalog =
        parser.catalog(
            """{"8":{"id":8,"name":"npc_dota_hero_juggernaut","localized_name":"Juggernaut"}}""",
            """{"blink":{"id":1,"dname":"Blink Dagger"},"trusty_shovel":{"id":288,"dname":"Trusty Shovel"}}""",
        )
    private val body =
        """
        {"match_id":123,"start_time":1792685540,"duration":2500,"radiant_win":true,
         "radiant_score":42,"dire_score":30,
         "players":[{"account_id":42,"player_slot":0,"hero_id":8,"kills":12,"deaths":3,"assists":9,
         "hero_damage":25000,"tower_damage":4000,"item_0":1,"item_1":0,"item_neutral":288}]}
        """.trimIndent()

    @Test
    fun `maps the actual player team score hero inventory and neutral item`() {
        val match = parser.match(body, 42, reference, catalog)
        assertThat(match.heroKey).isEqualTo("juggernaut")
        assertThat(match.heroName).isEqualTo("Juggernaut")
        assertThat(match.won).isTrue()
        assertThat(match.score).isEqualTo(42)
        assertThat(match.opponentScore).isEqualTo(30)
        assertThat(match.heroDamage).isEqualTo(25000)
        assertThat(match.buildingDamage).isEqualTo(4000)
        assertThat(match.items.single().key).isEqualTo("blink")
        assertThat(match.items.single().slot).isZero()
        assertThat(match.items.single().acquiredAtSeconds).isNull()
        assertThat(match.neutralItem?.key).isEqualTo("trusty_shovel")
        val dire = parser.match(body.replace("\"player_slot\":0", "\"player_slot\":128"), 42, reference, catalog)
        assertThat(dire.won).isFalse()
        assertThat(dire.score).isEqualTo(30)
        assertThat(dire.opponentScore).isEqualTo(42)
    }

    @Test
    fun `missing optional statistics stay absent rather than invented`() {
        val minimal =
            body
                .replace("\"hero_damage\":25000,\"tower_damage\":4000,", "")
                .replace("\"radiant_score\":42,\"dire_score\":30,", "")
                .replace(",\"item_neutral\":288", "")
        val match = parser.match(minimal, 42, reference, catalog)
        assertThat(match.heroDamage).isNull()
        assertThat(match.buildingDamage).isNull()
        assertThat(match.score).isNull()
        assertThat(match.neutralItem).isNull()
    }

    @Test
    fun `does not turn invalid provider responses into empty successful histories`() {
        listOf("{}", "null", "<html>Access denied</html>", "[{\"match_id\":123}]").stream().forEach {
            assertThatThrownBy { parser.matches(it, 100) }.isInstanceOf(DotabuffException::class.java)
        }
        assertThatThrownBy { parser.match(body, 99, reference, catalog) }
            .isInstanceOfSatisfying(DotabuffException::class.java) {
                assertThat(it.code).isEqualTo("PLAYER_STATS_UNAVAILABLE")
            }
        assertThatThrownBy { parser.match(body.replace("\"hero_id\":8", "\"hero_id\":999"), 42, reference, catalog) }
            .isInstanceOf(DotabuffException::class.java)
        assertThatThrownBy { parser.match(body.replace("\"kills\":12", "\"kills\":null"), 42, reference, catalog) }
            .isInstanceOf(DotabuffException::class.java)
    }

    @Test
    fun `continues full pages and stops at a shorter page`() {
        val entry = """{"match_id":123,"start_time":1792685540}"""
        assertThat(parser.matches("[$entry]", 1).hasNext).isTrue()
        assertThat(parser.matches("[$entry]", 100).hasNext).isFalse()
        assertThat(parser.matches("[]", 100).matches).isEmpty()
        assertThat(parser.matches("[]", 100).hasNext).isFalse()
        assertThatThrownBy {
            parser.matches("[$entry,{\"match_id\":124,\"start_time\":1792685541}]", 100)
        }.isInstanceOfSatisfying(DotabuffException::class.java) { assertThat(it.code).isEqualTo("UNSORTED_HISTORY") }
    }
}
