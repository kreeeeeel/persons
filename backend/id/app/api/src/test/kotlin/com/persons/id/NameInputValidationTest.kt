package com.persons.id

import com.persons.id.contract.dto.ChangeProfile
import com.persons.id.contract.dto.LanguageCode
import com.persons.id.contract.dto.Register
import jakarta.validation.Validation
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource

class NameInputValidationTest {
    @ParameterizedTest
    @ValueSource(ints = [10, 11])
    fun `registration and profile updates limit each name to ten characters`(length: Int) {
        val name = "я".repeat(length)
        Validation.buildDefaultValidatorFactory().use { factory ->
            listOf(
                Register(name, name, "user@example.test", LanguageCode.ru, name),
                ChangeProfile(name, name, name),
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
