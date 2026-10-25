package com.persons.person.component

import com.persons.person.contract.dto.AdminContentKind
import com.persons.person.contract.dto.AdminContentOrder
import com.persons.person.contract.dto.AdminContentPage
import com.persons.person.contract.dto.AdminContentStatus
import com.persons.person.contract.dto.Decision
import com.persons.person.contract.dto.DecisionInput
import com.persons.person.domain.Actor
import com.persons.person.domain.AdminContentFilter
import com.persons.person.domain.ChangeKind
import com.persons.person.exception.impl.ConflictException
import com.persons.person.exception.impl.ForbiddenException
import com.persons.person.exception.impl.InvalidInputException
import com.persons.person.service.AuthorProfileService
import com.persons.person.service.CommentService
import com.persons.person.service.ContentCatalogDao
import com.persons.person.service.CreditService
import com.persons.person.service.MediaService
import com.persons.person.service.ModerationQueueService
import com.persons.person.service.PersonAccessService
import com.persons.person.service.ProfileService
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import java.util.UUID
import java.util.stream.Collectors

@Component
class AdminContentComponent(
    private val catalog: ContentCatalogDao,
    private val authors: AuthorProfileService,
    private val access: PersonAccessService,
    private val queue: ModerationQueueService,
    private val moderation: ModerationComponent,
    private val profiles: ProfileService,
    private val media: MediaService,
    private val comments: CommentService,
    private val credits: CreditService,
) {
    @Transactional(readOnly = true)
    fun page(
        filter: AdminContentFilter,
        page: Int,
        size: Int,
        order: AdminContentOrder,
        actor: Actor,
    ): AdminContentPage {
        if (!actor.administrator) throw ForbiddenException()
        if (filter.createdFrom != null && filter.createdTo != null && filter.createdFrom >= filter.createdTo) {
            throw InvalidInputException()
        }
        val result = catalog.page(filter, page, size, order)
        val names = result.items.stream().filter { it.authorId != null }.collect(
            Collectors.toMap({ it.authorId as UUID }, { it.authorName }, { first, _ -> first }),
        )
        val identities = authors.profiles(names)
        return result.copy(
            items = result.items.stream().map {
                it.copy(
                    authorName = identities[it.authorId]?.authorName ?: it.authorName,
                    authorTag = identities[it.authorId]?.authorTag,
                    authorAvatarUrl = identities[it.authorId]?.authorAvatarUrl,
                )
            }.toList(),
        )
    }

    @Transactional
    fun hide(kind: AdminContentKind, id: UUID, reason: String, actor: Actor) {
        if (!actor.administrator) throw ForbiddenException()
        if (reason.isBlank() || reason.length > 1000) throw InvalidInputException()
        val initial = catalog.find(kind, id)
        val person = access.locked(initial.personId)
        val item = catalog.find(kind, id)
        if (item.status == AdminContentStatus.HIDDEN ||
            item.status == AdminContentStatus.DRAFT
        ) {
            throw ConflictException()
        }
        // Reuse decisions so rejected drafts cannot later be approved and resurrect a removed publication.
        queue.pendingRows(person.id).stream().filter { it.targetId == id }.forEach {
            moderation.decide(it.id, DecisionInput(Decision.REJECT, reason.trim()), actor)
        }
        if (item.status == AdminContentStatus.PENDING) return
        when (kind) {
            AdminContentKind.PERSON -> profiles.remove(id, actor, reason)
            AdminContentKind.PHOTO, AdminContentKind.MOMENT, AdminContentKind.AVATAR ->
                media.proposeRemoval(id, actor, reason)
            AdminContentKind.COMMENT -> comments.remove(id, actor, reason)
            AdminContentKind.CREDIT -> credits.remove(id, actor, reason)
            AdminContentKind.RATING -> queue.submit(
                person, id, ChangeKind.DELETE_RATING, actor, "Удаление оценки",
                payload = mapOf("text" to item.text), reason = reason,
            )
        }
    }
}
