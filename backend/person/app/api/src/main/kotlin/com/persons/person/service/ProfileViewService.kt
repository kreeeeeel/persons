package com.persons.person.service

import com.persons.person.configuration.properties.InternalProperties
import com.persons.person.dao.entity.ProfileViewEntity
import com.persons.person.dao.repository.ProfileViewRepository
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
class ProfileViewService(
    private val views: ProfileViewRepository,
    private val access: PersonAccessService,
    private val properties: InternalProperties,
    private val clock: Clock,
) {
    @Transactional
    fun record(id: UUID, visitor: UUID) {
        val person = access.locked(id)

        if (!person.published) {
            return
        }

        val day = LocalDate.now(clock)
        val mac = Mac.getInstance(HASH_ALGORITHM)
        mac.init(SecretKeySpec(properties.jwtSecret.toByteArray(StandardCharsets.UTF_8), HASH_ALGORITHM))
        val hash = HexFormat.of().formatHex(mac.doFinal("$id:$visitor:$day".toByteArray(StandardCharsets.UTF_8)))

        if (!views.seen(id, hash, day)) {
            views.save(ProfileViewEntity(personId = id, visitorHash = hash, viewDate = day))
        }
    }
}
