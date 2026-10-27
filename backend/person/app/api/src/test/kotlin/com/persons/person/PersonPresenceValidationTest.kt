package com.persons.person

import com.persons.person.component.ProfileValidator
import com.persons.person.contract.dto.PersonPresence
import com.persons.person.contract.dto.ProfileInput
import com.persons.person.contract.dto.RatingOptionInput
import com.persons.person.exception.impl.InvalidInputException
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import java.time.Clock
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

class PersonPresenceValidationTest {
    private val validator = ProfileValidator(Clock.fixed(Instant.parse("2026-10-27T00:00:00Z"), ZoneOffset.UTC))

    @Test
    fun `status and calendar date are paired and cannot refer to the future`() {
        val since = LocalDate.of(2026, 10, 27)
        val valid = PersonPresence(PersonPresence.Status.UNRESPONSIVE, since)
        assertThat(validator.normalize(input(valid)).presence).isEqualTo(valid)
        assertThat(validator.normalize(input(PersonPresence())).presence).isEqualTo(PersonPresence())
        listOf(
            PersonPresence(PersonPresence.Status.MISSING), PersonPresence(since = since),
            PersonPresence(PersonPresence.Status.MISSING, since.plusDays(1)),
        ).stream().forEach {
            assertThatThrownBy { validator.normalize(input(it)) }.isInstanceOf(InvalidInputException::class.java)
        }
    }

    private fun input(presence: PersonPresence): ProfileInput = ProfileInput(
        tag = "presence", firstName = "Имя", lastName = "", description = "", tags = emptyList(),
        socialLinks = emptyList(), ratingOptions = listOf(RatingOptionInput("💜", "Свой")), version = 0,
        presence = presence,
    )
}
