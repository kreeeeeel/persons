package com.persons.leetify

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.node.ArrayNode
import com.fasterxml.jackson.databind.node.ObjectNode
import com.persons.leetify.component.LeetifyParser
import com.persons.leetify.domain.CsMatchMode
import com.persons.leetify.domain.CsMatchOutcome
import com.persons.leetify.exception.LeetifyException
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

private const val STEAM_ID = "76561197960265770"

class LeetifyParserTest {
    private val mapper = ObjectMapper()
    private val parser = LeetifyParser(mapper)
    private val history = resource("history.json")
    private val profile = parser.profile(resource("profile.json"), STEAM_ID)

    @Test
    fun `joins historical ranks and identifies modes without substituting current profile ratings`() {
        val matches = parser.matches(history, profile)
        assertThat(matches).hasSize(3)
        assertThat(matches[0].mode).isEqualTo(CsMatchMode.PREMIER)
        assertThat(matches[0].rank).isEqualTo(18500)
        assertThat(matches[0].outcome).isEqualTo(CsMatchOutcome.VICTORY)
        assertThat(matches[0].score).isEqualTo(13)
        assertThat(matches[0].opponentScore).isEqualTo(9)
        assertThat(matches[0].hsPercent).isEqualTo(50.0)
        assertThat(matches[0].adr).isEqualTo(95.3)
        assertThat(matches[0].personalPerformance).isNull()
        assertThat(matches[0].durationSeconds).isNull()
        assertThat(matches[1].mode).isEqualTo(CsMatchMode.FACEIT)
        assertThat(matches[1].rank).isNull()
        assertThat(matches[1].faceitLevel).isEqualTo(9)
        assertThat(matches[1].faceitElo).isEqualTo(2450)
        assertThat(matches[2].mode).isEqualTo(CsMatchMode.WINGMAN)
        assertThat(matches[2].outcome).isEqualTo(CsMatchOutcome.DRAW)
    }

    @Test
    fun `missing match metadata remains unknown and rating never becomes Personal Performance`() {
        val match = parser.match(mapper.readTree(history)[0].toString(), STEAM_ID)
        assertThat(match.rank).isNull()
        assertThat(match.mode).isEqualTo(CsMatchMode.OTHER)
        assertThat(match.leetifyRating).isEqualTo(0.0432)
        assertThat(match.personalPerformance).isNull()
        assertThat(parser.matches("[]", profile)).isEmpty()
    }

    @Test
    fun `missing or invalid statistics fail instead of becoming an empty successful history`() {
        val root = mapper.readTree(history) as ArrayNode
        val player = root[0]["stats"][0] as ObjectNode
        player.remove("total_kills")
        assertThatThrownBy { parser.matches(root.toString(), profile) }.isInstanceOf(LeetifyException::class.java)
        assertThatThrownBy { parser.matches("{}", profile) }.hasMessageContaining("INVALID_HISTORY")
        assertThatThrownBy { parser.matches("not json", profile) }.hasMessageContaining("INVALID_JSON")
        assertThatThrownBy { parser.profile("{}", STEAM_ID) }.hasMessageContaining("INVALID_PROFILE")
        assertThatThrownBy {
            parser.profile(
                """{"privacy_mode":"private"}""",
                STEAM_ID,
            )
        }.hasMessageContaining("PROFILE_PRIVATE")
    }

    private fun resource(name: String): String {
        val stream = javaClass.getResourceAsStream("/$name")
        if (stream == null) {
            throw IllegalStateException("Missing fixture $name")
        }
        return stream.bufferedReader().use { it.readText() }
    }
}
