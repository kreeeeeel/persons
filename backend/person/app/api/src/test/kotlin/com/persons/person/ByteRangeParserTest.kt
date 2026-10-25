package com.persons.person

import com.persons.person.component.ByteRangeParser
import com.persons.person.exception.impl.InvalidRangeException
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.assertThrows
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource

class ByteRangeParserTest {
    private val parser = ByteRangeParser()

    @Test
    fun `supports closed open and suffix ranges with clamped ends`() {
        assertThat(parser.parse("bytes=0-9", 100)?.length).isEqualTo(10)
        assertThat(parser.parse("bytes=95-200", 100)?.end).isEqualTo(99)
        assertThat(parser.parse("bytes=90-", 100)?.length).isEqualTo(10)
        assertThat(parser.parse("bytes=-20", 100)?.start).isEqualTo(80)
        assertThat(parser.parse("bytes=-200", 100)?.start).isZero()
        assertThat(parser.parse(null, 100)).isNull()
    }

    @ParameterizedTest
    @ValueSource(
        strings = [
            "bytes=100-",
            "bytes=9-2",
            "bytes=-0",
            "bytes=-",
            "bytes=1-2,3-4",
            "items=0-2",
            "bytes=9999999999999999999999-",
        ],
    )
    fun `rejects malformed multiple and unsatisfiable ranges`(range: String) {
        assertThrows<InvalidRangeException> { parser.parse(range, 100) }
    }
}
