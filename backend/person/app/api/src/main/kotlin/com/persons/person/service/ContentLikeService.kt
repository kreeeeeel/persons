package com.persons.person.service

import com.persons.person.contract.dto.LikeState
import com.persons.person.dao.entity.ContentLikeEntity
import com.persons.person.dao.repository.CommentRepository
import com.persons.person.dao.repository.ContentLikeRepository
import com.persons.person.dao.repository.CreditEntryRepository
import com.persons.person.dao.repository.RatingRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.ContentKind
import com.persons.person.domain.PageRestrictionScope
import com.persons.person.domain.ReactionKind
import com.persons.person.exception.impl.NotFoundException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.util.UUID
import java.util.stream.Collectors

@Service
class ContentLikeService(
    private val likes: ContentLikeRepository,
    private val comments: CommentRepository,
    private val ratings: RatingRepository,
    private val loans: CreditEntryRepository,
    private val media: MediaService,
    private val access: PersonAccessService,
    private val clock: Clock,
    private val pageRestrictions: PageRestrictionService,
) {
    @Transactional(readOnly = true)
    fun states(kind: ContentKind, ids: List<UUID>, actor: Actor?): Map<UUID, LikeState> {
        val counts = likes.counts(kind, ids, ReactionKind.LIKE)
        val dislikes = likes.counts(kind, ids, ReactionKind.DISLIKE)
        val mine = likes.mine(kind, ids, actor?.id)
        return ids.stream().collect(
            Collectors.toMap({ it }, {
                LikeState(
                    count = counts[it] ?: 0, liked = mine[it] == ReactionKind.LIKE,
                    dislikes = dislikes[it] ?: 0, disliked = mine[it] == ReactionKind.DISLIKE,
                )
            }),
        )
    }

    @Transactional(readOnly = true)
    fun state(kind: ContentKind, id: UUID, actor: Actor?): LikeState {
        visibleTarget(kind, id, actor)
        return states(kind, listOf(id), actor).getValue(id)
    }

    @Transactional
    fun react(
        kind: ContentKind,
        id: UUID,
        reaction: ReactionKind?,
        actor: Actor,
        removeOnly: ReactionKind? = null,
    ): LikeState {
        val personId = visibleTarget(kind, id, actor)
        access.locked(personId)
        if (reaction != null) pageRestrictions.ensure(personId, actor, PageRestrictionScope.REACTIONS)
        visibleTarget(kind, id, actor)
        val existing = likes.byUser(kind, id, actor.id)
        if (reaction != null && existing?.reaction != reaction) {
            val row = existing ?: ContentLikeEntity(targetKind = kind, targetId = id, userId = actor.id)
            row.reaction = reaction
            row.createdAt = clock.instant()
            row.authorName = actor.name
            likes.save(row)
        } else if (reaction == null && existing != null && (removeOnly == null || existing.reaction == removeOnly)) {
            likes.delete(existing)
        }
        likes.flush()
        return states(kind, listOf(id), actor).getValue(id)
    }

    private fun visibleTarget(kind: ContentKind, id: UUID, actor: Actor?): UUID {
        val personId = when (kind) {
            ContentKind.COMMENT -> {
                val row = comments.findById(id).orElseThrow { NotFoundException() }
                if (row.deleted || !row.published) throw NotFoundException()
                row.mediaId?.let { media.interactive(it, actor) }
                row.personId
            }
            ContentKind.RATING -> ratings.findById(id).orElseThrow { NotFoundException() }.personId
            ContentKind.LOAN -> {
                val row = loans.findById(id).orElseThrow { NotFoundException() }
                if (row.deleted || !row.published) throw NotFoundException()
                row.personId
            }
        }
        access.visible(personId, actor)
        return personId
    }
}
