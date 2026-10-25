package com.persons.person.controller

import com.persons.person.component.ActorResolver
import com.persons.person.contract.api.EngagementApi
import com.persons.person.contract.dto.ContentKind
import com.persons.person.contract.dto.ContentReactionInput
import com.persons.person.contract.dto.LikeState
import com.persons.person.domain.ReactionKind
import com.persons.person.service.ContentLikeService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import java.util.UUID
import com.persons.person.domain.ContentKind as DomainContentKind

@RestController
class EngagementController(private val actors: ActorResolver, private val likes: ContentLikeService) : EngagementApi {
    override fun getContentLike(id: UUID, kind: ContentKind): ResponseEntity<LikeState> =
        ResponseEntity.ok(likes.state(DomainContentKind.valueOf(kind.name), id, actors.optional()))

    override fun likeContent(id: UUID, kind: ContentKind): ResponseEntity<LikeState> = ResponseEntity.ok(
        likes.react(DomainContentKind.valueOf(kind.name), id, ReactionKind.LIKE, actors.required()),
    )

    override fun unlikeContent(id: UUID, kind: ContentKind): ResponseEntity<LikeState> = ResponseEntity.ok(
        likes.react(DomainContentKind.valueOf(kind.name), id, null, actors.required(), ReactionKind.LIKE),
    )

    override fun reactToContent(
        id: UUID,
        kind: ContentKind,
        contentReactionInput: ContentReactionInput,
    ): ResponseEntity<LikeState> = ResponseEntity.ok(
        likes.react(
            DomainContentKind.valueOf(kind.name), id, ReactionKind.valueOf(contentReactionInput.reaction.name),
            actors.required(),
        ),
    )

    override fun clearContentReaction(id: UUID, kind: ContentKind): ResponseEntity<LikeState> = ResponseEntity.ok(
        likes.react(DomainContentKind.valueOf(kind.name), id, null, actors.required()),
    )
}
