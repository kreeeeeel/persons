package com.persons.person.controller

import com.persons.person.component.ActorResolver
import com.persons.person.component.CommentEventsComponent
import com.persons.person.component.CommunityFeedComponent
import com.persons.person.contract.api.FeedApi
import com.persons.person.contract.dto.CommentEventPage
import com.persons.person.contract.dto.CommunityFeedFilter
import com.persons.person.contract.dto.CommunityFeedPage
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController

@RestController
class FeedController(
    private val actors: ActorResolver,
    private val comments: CommentEventsComponent,
    private val feed: CommunityFeedComponent,
) : FeedApi {
    override fun listFeed(page: Int, size: Int, kind: CommunityFeedFilter?): ResponseEntity<CommunityFeedPage> =
        ResponseEntity.ok(feed.page(actors.optional(), page, size, kind))
    override fun listCommentEvents(page: Int, size: Int): ResponseEntity<CommentEventPage> =
        ResponseEntity.ok(comments.page(actors.optional(), page, size))
}
