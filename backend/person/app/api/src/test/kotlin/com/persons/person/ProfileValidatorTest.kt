package com.persons.person

import com.persons.person.component.ProfileValidator
import com.persons.person.contract.dto.ProfileInput
import com.persons.person.contract.dto.RatingOptionInput
import com.persons.person.contract.dto.SocialLink
import com.persons.person.contract.dto.SocialNetwork
import com.persons.person.exception.impl.InvalidInputException
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource

class ProfileValidatorTest {
    private val validator = ProfileValidator()

    @Test
    fun `normalizes names tags and descriptions while preserving configured emojis`() {
        val result = validator.normalize(profile().copy(firstName = "  Вадим  ", tags = listOf(" Настолки ")))

        assertThat(result.firstName).isEqualTo("Вадим")
        assertThat(result.tags).containsExactly("Настолки")
        assertThat(result.ratingOptions.first().emoji).isEqualTo("🔥")
    }

    @Test
    fun `rejects reserved tags duplicate options and unsafe social links`() {
        assertThrows<InvalidInputException> { validator.normalize(profile().copy(tag = "api")) }
        assertThrows<InvalidInputException> { validator.normalize(profile().copy(tags = listOf("Игра", "игра"))) }
        assertThrows<InvalidInputException> {
            validator.normalize(
                profile().copy(
                    ratingOptions = listOf(
                        RatingOptionInput(
                            "🔥",
                            "Огонь",
                        ),
                        RatingOptionInput(
                            "🔥",
                            "Ещё огонь",
                        ),
                    ),
                ),
            )
        }
        assertThrows<InvalidInputException> {
            validator.normalize(
                profile().copy(
                    socialLinks = listOf(
                        SocialLink(
                            SocialNetwork.TELEGRAM,
                            "https://t.me.evil.example/user",
                        ),
                    ),
                ),
            )
        }
        assertThrows<InvalidInputException> {
            validator.normalize(
                profile().copy(
                    socialLinks = listOf(
                        SocialLink(
                            SocialNetwork.TELEGRAM,
                            "https://name:password@t.me/user",
                        ),
                    ),
                ),
            )
        }
    }

    @ParameterizedTest
    @ValueSource(strings = ["@Some.User_42", "some_user", "СтарыйНик#1234"])
    fun `accepts Discord usernames and legacy tags without treating them as links`(tag: String) {
        val result = validator.normalize(
            profile().copy(socialLinks = listOf(SocialLink(SocialNetwork.DISCORD, tag = tag))),
        )
        val expected = if ('#' in tag) tag else tag.removePrefix("@").lowercase()
        assertThat(result.socialLinks.single().tag).isEqualTo(expected)
        assertThat(result.socialLinks.single().url).isNull()
    }

    @ParameterizedTest
    @ValueSource(strings = ["a", "has space", "user..name", "https://example.com", "bad#123", "<script>"])
    fun `rejects invalid Discord tags`(tag: String) {
        assertThrows<InvalidInputException> {
            validator.normalize(profile().copy(socialLinks = listOf(SocialLink(SocialNetwork.DISCORD, tag = tag))))
        }
    }

    @Test
    fun `rejects ambiguous social contacts and preserves legacy Discord links`() {
        listOf(
            SocialLink(SocialNetwork.DISCORD),
            SocialLink(SocialNetwork.DISCORD, url = "https://discord.com/users/123", tag = "some_user"),
            SocialLink(SocialNetwork.TELEGRAM, tag = "some_user"),
            SocialLink(SocialNetwork.STEAM),
        ).stream().forEach { link ->
            assertThrows<InvalidInputException> { validator.normalize(profile().copy(socialLinks = listOf(link))) }
        }
        val link = SocialLink(SocialNetwork.DISCORD, url = "https://discord.com/users/123")
        assertThat(validator.normalize(profile().copy(socialLinks = listOf(link))).socialLinks).containsExactly(link)
    }

    private fun profile() = ProfileInput(
        "vadim",
        "Вадим",
        "",
        "Описание",
        emptyList(),
        emptyList(),
        listOf(
            RatingOptionInput(
                "🔥",
                "Огонь",
            ),
        ),
        0,
    )
}
