package com.persons.dynamicproperties

import com.persons.dynamicproperties.exception.DynPropertyException
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class DynSchemaTest {
    @Test
    fun `rejects invalid JSON types duplicate keys trailing input and invalid email`() {
        val boolean = DynPropertyFactory.createBoolean("test.boolean").build().definition
        listOf("\"false\"", "false true", "{", "").stream().forEach { raw ->
            assertThatThrownBy { DynSchema.validate(boolean, raw) }.isInstanceOf(DynPropertyException::class.java)
        }
        val email = DynPropertyFactory.createEmail("test.email").build().definition
        assertThatThrownBy { DynSchema.validate(email, "\"invalid\"") }.isInstanceOf(DynPropertyException::class.java)
        assertThat(DynSchema.validate(email, "\"privacy@example.test\"").asText()).isEqualTo("privacy@example.test")
        val localized = DynPropertyFactory.createLocalizedStrings("test.map", mapOf("ru" to "", "en" to "")).build().definition
        listOf("""{"ru":"name"}""", """{"ru":"one","ru":"two","en":""}""").stream().forEach { raw ->
            assertThatThrownBy { DynSchema.validate(localized, raw) }.isInstanceOf(DynPropertyException::class.java)
        }
    }
}
