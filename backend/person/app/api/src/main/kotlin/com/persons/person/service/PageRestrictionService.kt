package com.persons.person.service

import com.persons.person.contract.dto.PageRestriction
import com.persons.person.contract.dto.PageRestrictionInput
import com.persons.person.contract.dto.PageRestrictionList
import com.persons.person.contract.dto.PageRestrictionPage
import com.persons.person.dao.entity.PageRestrictionEntity
import com.persons.person.dao.repository.PageRestrictionRepository
import com.persons.person.dao.repository.PersonRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.ErrorCode
import com.persons.person.domain.PageRestrictionScope
import com.persons.person.exception.impl.ForbiddenException
import com.persons.person.exception.impl.InvalidInputException
import com.persons.person.exception.impl.NotFoundException
import com.persons.person.transformer.toSummary
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.time.ZoneOffset
import java.util.UUID
import java.util.stream.Collectors
import com.persons.person.contract.dto.PageRestrictionScope as ScopeDto

@Service
class PageRestrictionService(
    private val rows: PageRestrictionRepository,
    private val persons: PersonRepository,
    private val access: PersonAccessService,
    private val clock: Clock,
    private val authors: AuthorProfileService,
) {
    @Transactional(readOnly = true)
    fun page(page: Int, size: Int, query: String, userId: UUID?, actor: Actor): PageRestrictionPage {
        if (!actor.administrator) throw ForbiddenException()
        val result = rows.active(
            clock.instant(), query, userId,
            PageRequest.of(
                page, size, Sort.by(Sort.Direction.DESC, "createdAt", "id"),
            ),
        )
        val people = persons.findAllById(result.content.stream().map { it.personId }.distinct().toList()).stream()
            .collect(Collectors.toMap({ it.id }, { it.toSummary() }))
        val profiles = authors.profiles(
            result.content.stream().collect(
                Collectors.toMap({ it.userId }, { "" }, { first, _ -> first }),
            ),
        )
        return PageRestrictionPage(
            result.content.stream().map {
                val person = people[it.personId] ?: throw NotFoundException()
                val profile = profiles[it.userId]
                dto(it, person.tag, person.fullName).copy(
                    userName = profile?.authorName, userTag = profile?.authorTag,
                    userAvatarUrl = profile?.authorAvatarUrl, personAvatarMediaId = person.avatarMediaId,
                )
            }.toList(),
            result.totalElements, page, size,
        )
    }

    @Transactional(readOnly = true)
    fun list(userId: UUID, actor: Actor): PageRestrictionList {
        if (!actor.administrator) throw ForbiddenException()
        val restrictions = rows.byUser(userId)
        val destinations = persons.findAllById(restrictions.stream().map { it.personId }.distinct().toList()).stream()
            .collect(Collectors.toMap({ it.id }, { it.toSummary() }))
        return PageRestrictionList(
            restrictions.stream().map {
                val person = destinations[it.personId] ?: throw NotFoundException()
                dto(it, person.tag, person.fullName)
            }.toList(),
        )
    }

    @Transactional
    fun set(userId: UUID, input: PageRestrictionInput, actor: Actor): PageRestriction {
        if (!actor.administrator) throw ForbiddenException()
        val expires = input.expiresAt?.toInstant()
        if (input.reason.trim().length !in 3..1000 ||
            input.scopes.isEmpty() ||
            (expires != null && expires <= clock.instant())
        ) {
            throw InvalidInputException()
        }
        val person = access.locked(input.personId)
        if (person.deleted) throw NotFoundException()
        val row = rows.forPage(userId, person.id) ?: PageRestrictionEntity(userId = userId, personId = person.id)
        row.scopes.clear()
        row.scopes.addAll(input.scopes.stream().map { PageRestrictionScope.valueOf(it.name) }.toList())
        row.reason = input.reason.trim()
        row.expiresAt = expires
        row.revoked = false
        row.createdAt = clock.instant()
        row.createdBy = actor.id
        rows.saveAndFlush(row)
        return dto(row, person.tag, person.toSummary().fullName)
    }

    @Transactional
    fun revoke(userId: UUID, id: UUID, actor: Actor) {
        if (!actor.administrator) throw ForbiddenException()
        access.locked(rows.personId(id) ?: throw NotFoundException())
        val row = rows.findById(id).orElseThrow { NotFoundException() }
        if (row.userId != userId) throw NotFoundException()
        row.revoked = true
    }

    @Transactional(readOnly = true)
    fun ensure(personId: UUID, actor: Actor, vararg scopes: PageRestrictionScope) {
        val row = rows.forPage(actor.id, personId)
        if (row != null && active(row) && row.scopes.stream().anyMatch { it in scopes }) {
            throw ForbiddenException(ErrorCode.PAGE_ACTION_RESTRICTED)
        }
    }

    private fun active(row: PageRestrictionEntity): Boolean =
        !row.revoked && (row.expiresAt?.let { it > clock.instant() } ?: true)

    private fun dto(row: PageRestrictionEntity, tag: String, name: String): PageRestriction = PageRestriction(
        row.id, row.userId, row.personId, tag, name,
        row.scopes.stream().map { ScopeDto.valueOf(it.name) }.collect(Collectors.toSet()), row.reason,
        row.createdAt.atOffset(ZoneOffset.UTC), active(row), row.expiresAt?.atOffset(ZoneOffset.UTC),
    )
}
