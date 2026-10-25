package com.persons.person.controller

import com.persons.person.component.ActorResolver
import com.persons.person.contract.api.PersonsApi
import com.persons.person.contract.dto.DirectoryOrder
import com.persons.person.contract.dto.DirectoryPage
import com.persons.person.contract.dto.ModerationReceipt
import com.persons.person.contract.dto.MomentPage
import com.persons.person.contract.dto.MyPersonState
import com.persons.person.contract.dto.PersonProfile
import com.persons.person.contract.dto.PersonSearchPage
import com.persons.person.contract.dto.PersonSummary
import com.persons.person.contract.dto.PhotoPage
import com.persons.person.contract.dto.ProfileInput
import com.persons.person.contract.dto.ViewInput
import com.persons.person.service.DirectoryQueryService
import com.persons.person.service.MomentService
import com.persons.person.service.MyPersonService
import com.persons.person.service.PersonQueryService
import com.persons.person.service.PhotoService
import com.persons.person.service.ProfileService
import com.persons.person.service.ProfileViewService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import java.util.UUID

@RestController
class PersonsController(
    private val actors: ActorResolver,
    private val query: PersonQueryService,
    private val profiles: ProfileService,
    private val moments: MomentService,
    private val photos: PhotoService,
    private val views: ProfileViewService,
    private val mine: MyPersonService,
    private val directory: DirectoryQueryService,
) : PersonsApi {
    override fun listDirectory(page: Int, size: Int, order: DirectoryOrder): ResponseEntity<DirectoryPage> =
        ResponseEntity.ok(directory.page(page, size, order))
    override fun recommendPersons(size: Int): ResponseEntity<List<PersonSummary>> =
        ResponseEntity.ok(query.recommendations(actors.optional(), size))

    override fun getMyPerson(): ResponseEntity<MyPersonState> = ResponseEntity.ok(mine.state(actors.required()))

    override fun requestMyPerson(profileInput: ProfileInput): ResponseEntity<ModerationReceipt> =
        ResponseEntity.accepted().body(mine.request(profileInput, actors.required()))
    override fun searchPersons(q: String, page: Int, size: Int): ResponseEntity<PersonSearchPage> =
        ResponseEntity.ok(query.search(q, page, size))

    override fun getPerson(tag: String): ResponseEntity<PersonProfile> =
        ResponseEntity.ok(query.profile(tag, actors.optional()))

    override fun createPerson(profileInput: ProfileInput): ResponseEntity<ModerationReceipt> =
        ResponseEntity.accepted().body(profiles.create(profileInput, actors.required()))

    override fun updatePerson(id: UUID, profileInput: ProfileInput): ResponseEntity<ModerationReceipt> =
        ResponseEntity.accepted().body(profiles.propose(id, profileInput, actors.required()))

    override fun deletePerson(id: UUID): ResponseEntity<ModerationReceipt> =
        ResponseEntity.accepted().body(profiles.remove(id, actors.required()))

    override fun listMoments(id: UUID, page: Int, size: Int): ResponseEntity<MomentPage> =
        ResponseEntity.ok(moments.page(id, page, size, actors.optional()))

    override fun listPhotos(id: UUID, page: Int, size: Int): ResponseEntity<PhotoPage> =
        ResponseEntity.ok(photos.page(id, page, size, actors.optional()))

    override fun recordView(id: UUID, viewInput: ViewInput): ResponseEntity<Unit> {
        actors.requireService()
        views.record(id, viewInput.visitorId)

        return ResponseEntity.noContent().build()
    }
}
