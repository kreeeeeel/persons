package com.persons.person.controller

import com.persons.person.component.ActorResolver
import com.persons.person.component.ModerationComponent
import com.persons.person.contract.api.AdminApi
import com.persons.person.contract.dto.AdminPerson
import com.persons.person.contract.dto.AdminPersonPage
import com.persons.person.contract.dto.DecisionInput
import com.persons.person.contract.dto.ModerationContentType
import com.persons.person.contract.dto.ModerationFilterStatus
import com.persons.person.contract.dto.ModerationItem
import com.persons.person.contract.dto.ModerationOrder
import com.persons.person.contract.dto.ModerationPage
import com.persons.person.contract.dto.ModerationReceipt
import com.persons.person.contract.dto.OwnerLinkInput
import com.persons.person.domain.ModerationFilter
import com.persons.person.domain.ReviewStatus
import com.persons.person.service.ModerationQueueService
import com.persons.person.service.PersonQueryService
import com.persons.person.service.ProfileService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import java.time.OffsetDateTime
import java.util.UUID

@RestController
class ModerationController(
    private val actors: ActorResolver,
    private val query: PersonQueryService,
    private val queue: ModerationQueueService,
    private val moderation: ModerationComponent,
    private val profiles: ProfileService,
) : AdminApi {
    override fun getAdminPerson(id: UUID): ResponseEntity<AdminPerson> =
        ResponseEntity.ok(query.adminPerson(id, actors.administrator()))

    override fun listAdminPersons(page: Int, size: Int, q: String?): ResponseEntity<AdminPersonPage> {
        actors.administrator()

        return ResponseEntity.ok(query.admin(q.orEmpty(), page, size))
    }

    override fun listModeration(
        page: Int,
        size: Int,
        status: ModerationFilterStatus?,
        type: ModerationContentType?,
        q: String?,
        authorId: UUID?,
        personId: UUID?,
        createdFrom: OffsetDateTime?,
        createdTo: OffsetDateTime?,
        order: ModerationOrder?,
    ): ResponseEntity<ModerationPage> {
        actors.administrator()
        val selected = status ?: ModerationFilterStatus.PENDING
        return ResponseEntity.ok(
            queue.page(
                ModerationFilter(
                    status = if (selected == ModerationFilterStatus.ALL) null else ReviewStatus.valueOf(selected.name),
                    type = type,
                    query = q.orEmpty(),
                    authorId = authorId,
                    personId = personId,
                    createdFrom = createdFrom?.toInstant(),
                    createdTo = createdTo?.toInstant(),
                ),
                page, size, order ?: ModerationOrder.OLDEST,
            ),
        )
    }

    override fun getModeration(id: UUID): ResponseEntity<ModerationItem> {
        actors.administrator()
        return ResponseEntity.ok(queue.item(id))
    }

    override fun decideModeration(id: UUID, decisionInput: DecisionInput): ResponseEntity<ModerationItem> =
        ResponseEntity.ok(moderation.decide(id, decisionInput, actors.administrator()))

    override fun linkAccount(id: UUID, ownerLinkInput: OwnerLinkInput): ResponseEntity<ModerationReceipt> {
        val actor = actors.administrator()
        val ownerId = ownerLinkInput.email?.let { actors.accountId(it.trim()) }

        return ResponseEntity.accepted().body(profiles.link(id, ownerId, actor))
    }
}
