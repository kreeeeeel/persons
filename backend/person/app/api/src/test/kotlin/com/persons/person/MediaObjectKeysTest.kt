package com.persons.person

import com.persons.person.component.MediaObjectKeys
import com.persons.person.domain.MediaKind
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import java.util.UUID

class MediaObjectKeysTest {
    private val keys = MediaObjectKeys()
    private val personId = UUID.randomUUID()
    private val mediaId = UUID.randomUUID()

    @Test
    fun `separates private media categories from public illustrations`() {
        assertThat(keys.media(MediaKind.PHOTO, personId, mediaId)).isEqualTo("photo/$personId/$mediaId/original")
        assertThat(keys.media(MediaKind.MOMENT, personId, mediaId)).isEqualTo("video/$personId/$mediaId/original")
        assertThat(keys.media(MediaKind.AVATAR, personId, mediaId))
            .isEqualTo("avatars/persons/$personId/$mediaId/original")
        assertThat(keys.media(MediaKind.PROOF, personId, mediaId)).isEqualTo("proofs/$personId/$mediaId/original")
        assertThat(keys.preview(personId, mediaId)).isEqualTo("video/$personId/$mediaId/preview")
        assertThat(keys.preview(personId, mediaId)).doesNotStartWith(keys.media(MediaKind.MOMENT, personId, mediaId))
        assertThat(keys.achievement(mediaId)).isEqualTo("achievments/$mediaId")
    }
}
