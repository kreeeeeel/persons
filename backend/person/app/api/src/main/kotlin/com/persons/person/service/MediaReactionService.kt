package com.persons.person.service

import com.persons.person.contract.dto.MediaReaction
import com.persons.person.contract.dto.MediaReactionState
import com.persons.person.dao.entity.MediaReactionEntity
import com.persons.person.dao.repository.MediaReactionRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.PageRestrictionScope
import com.persons.person.domain.ReactionKind
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.time.Clock
import java.util.UUID
import java.util.stream.Collectors

@Service
class MediaReactionService(
    private val reactions: MediaReactionRepository,
    private val media: MediaService,
    private val access: PersonAccessService,
    private val clock: Clock,
    private val pageRestrictions: PageRestrictionService,
) {
    fun states(ids: List<UUID>, actor: Actor?): Map<UUID, MediaReactionState> {
        val counts = reactions.counts(ids)
        val mine = actor?.let { reactions.mine(ids, it.id) }.orEmpty()
        return ids.stream().collect(
            Collectors.toMap({ it }, {
                MediaReactionState(
                    counts[it]?.get(ReactionKind.LIKE) ?: 0,
                    counts[it]?.get(ReactionKind.DISLIKE) ?: 0,
                    mine[it]?.let { kind -> MediaReaction.valueOf(kind.name) },
                )
            }),
        )
    }

    @Transactional
    fun react(id: UUID, reaction: ReactionKind?, actor: Actor): MediaReactionState {
        val row = media.interactive(id, actor)
        access.locked(row.personId)
        if (reaction != null) pageRestrictions.ensure(row.personId, actor, PageRestrictionScope.REACTIONS)
        media.interactive(id, actor)
        val previous = reactions.byUser(id, actor.id)
        if (reaction == null) {
            if (previous != null) reactions.delete(previous)
        } else {
            val value = previous ?: MediaReactionEntity(mediaId = id, userId = actor.id, createdAt = clock.instant())
            value.reaction = reaction
            value.authorName = actor.name
            reactions.save(value)
        }
        reactions.flush()
        return states(listOf(id), actor).getValue(id)
    }
}
