package com.persons.person.service

import com.persons.person.contract.dto.PublicAuthor
import com.persons.person.dao.repository.PersonRepository
import com.persons.person.domain.Actor
import com.persons.person.exception.impl.NotFoundException
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

private val ACCOUNT_ID = Regex("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")

@Component
class PublicAuthorService(
    private val persons: PersonRepository,
    private val access: AuthorAccessService,
    private val profiles: AuthorProfileService,
) {
    @Transactional(readOnly = true)
    fun byHandle(handle: String, viewer: Actor?): PublicAuthor {
        val id = if (ACCOUNT_ID.matches(handle)) {
            UUID.fromString(handle)
        } else {
            val person = persons.byTag(handle)
            if (person == null || !person.published || person.deleted || person.ownerAccountId == null) {
                throw NotFoundException()
            }
            person.ownerAccountId as UUID
        }
        if (viewer?.id != id) {
            access.requireParticipant(id)
        }
        return byId(id, viewer?.takeIf { it.id == id }?.name.orEmpty())
    }

    fun byId(id: UUID, fallback: String = ""): PublicAuthor {
        val profile = profiles.profiles(mapOf(id to fallback))[id]
        if (profile == null || profile.authorName.isBlank()) {
            throw NotFoundException()
        }
        return PublicAuthor(id, profile.authorTag ?: id.toString(), profile.authorName, profile.authorAvatarUrl)
    }
}
