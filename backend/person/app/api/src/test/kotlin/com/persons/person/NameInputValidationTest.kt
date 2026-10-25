package com.persons.person

import com.persons.person.contract.dto.ProfileInput
import com.persons.person.contract.dto.RatingOptionInput
import com.persons.person.contract.dto.UserProfileUpdate
import jakarta.validation.Validation
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource

class NameInputValidationTest {
    @ParameterizedTest
    @ValueSource(ints = [10, 11])
    fun `page and admin account updates limit each name to ten characters`(length: Int) {
        val name = "я".repeat(length)
        Validation.buildDefaultValidatorFactory().use { factory ->
            listOf(
                ProfileInput(
                    "person", name, name, "", emptyList(), emptyList(),
                    listOf(RatingOptionInput("💜", "Свой")), 0, patronymic = name,
                ),
                UserProfileUpdate(name, name, name),
            ).stream().forEach { input ->
                val paths = factory.validator.validate(input).stream().map { it.propertyPath.toString() }.toList()
                if (length == 10) {
                    assertThat(paths).isEmpty()
                } else {
                    assertThat(paths).containsExactlyInAnyOrder("firstName", "lastName", "patronymic")
                }
            }
        }
    }
}
