package com.persons.person.service

import com.persons.person.configuration.properties.InternalProperties
import com.persons.person.contract.dto.MediaViewState
import com.persons.person.dao.entity.MediaViewEntity
import com.persons.person.dao.repository.MediaViewRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.MediaKind
import com.persons.person.domain.MediaStatus
import com.persons.person.exception.impl.NotFoundException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.nio.charset.StandardCharsets
import java.time.Clock
import java.time.LocalDate
import java.util.HexFormat
import java.util.UUID
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

private const val HASH_ALGORITHM = "HmacSHA256"

@Service
class MediaViewService(
    private val views: MediaViewRepository,
    private val media: MediaService,
    private val access: PersonAccessService,
    private val properties: InternalProperties,
    private val clock: Clock,
) {
    @Transactional
    fun record(id: UUID, visitor: UUID, actor: Actor?): MediaViewState {
        val row = media.readable(id, actor)
        if (row.kind !in setOf(
                MediaKind.PHOTO,
                MediaKind.MOMENT,
            )
        ) {
            throw NotFoundException()
        }
        if (row.status != MediaStatus.PUBLISHED) return MediaViewState(0)
        access.locked(row.personId)
        media.interactive(id, actor)
        val day = LocalDate.now(clock)
        val mac = Mac.getInstance(HASH_ALGORITHM)
        mac.init(SecretKeySpec(properties.jwtSecret.toByteArray(StandardCharsets.UTF_8), HASH_ALGORITHM))
        val hash = HexFormat.of().formatHex(mac.doFinal("$id:$visitor:$day".toByteArray(StandardCharsets.UTF_8)))
        if (!views.seen(id, hash, day)) {
            views.saveAndFlush(MediaViewEntity(mediaId = id, visitorHash = hash, viewDate = day))
        }
        return MediaViewState(views.total(id))
    }
}
