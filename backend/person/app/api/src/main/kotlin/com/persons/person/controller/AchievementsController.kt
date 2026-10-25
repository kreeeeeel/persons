package com.persons.person.controller

import com.persons.person.component.AchievementImageComponent
import com.persons.person.component.ActorResolver
import com.persons.person.component.PersonMediaStore
import com.persons.person.contract.api.AchievementsApi
import com.persons.person.contract.dto.Achievement
import com.persons.person.contract.dto.AchievementGrantInput
import com.persons.person.contract.dto.AchievementGrantResult
import com.persons.person.contract.dto.AchievementInput
import com.persons.person.contract.dto.AchievementPage
import com.persons.person.contract.dto.AchievementType
import com.persons.person.contract.dto.PersonAchievementPage
import com.persons.person.service.AchievementService
import org.springframework.core.io.Resource
import org.springframework.http.HttpHeaders
import org.springframework.http.HttpStatus
import org.springframework.http.MediaType
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import java.util.UUID

@RestController
class AchievementsController(
    private val actors: ActorResolver,
    private val service: AchievementService,
    private val images: AchievementImageComponent,
    private val store: PersonMediaStore,
) : AchievementsApi {
    override fun listAchievements(q: String?, page: Int, size: Int): ResponseEntity<AchievementPage> {
        actors.administrator()
        return ResponseEntity.ok(service.page(page, size, q.orEmpty()))
    }

    override fun createAchievement(
        title: String,
        description: String,
        file: MultipartFile,
        type: AchievementType?,
        active: Boolean?,
        pageAgeYears: Int?,
    ): ResponseEntity<Achievement> {
        actors.administrator()
        val assignmentType = type ?: AchievementType.MANUAL
        service.validate(title, description, assignmentType, pageAgeYears)
        return ResponseEntity.status(HttpStatus.CREATED).body(
            service.create(title, description, images.upload(file), assignmentType, pageAgeYears, active ?: true),
        )
    }

    override fun updateAchievement(id: UUID, achievementInput: AchievementInput): ResponseEntity<Achievement> {
        actors.administrator()
        return ResponseEntity.ok(service.update(id, achievementInput))
    }

    override fun updateAchievementImage(id: UUID, file: MultipartFile): ResponseEntity<Achievement> {
        val actor = actors.administrator()
        service.readable(id, actor)
        return ResponseEntity.ok(service.image(id, images.upload(file)))
    }

    override fun deleteAchievement(id: UUID): ResponseEntity<Unit> {
        actors.administrator()
        service.delete(id)
        return ResponseEntity.noContent().build()
    }

    override fun grantAchievement(
        id: UUID,
        achievementGrantInput: AchievementGrantInput,
    ): ResponseEntity<AchievementGrantResult> =
        ResponseEntity.ok(service.grant(id, achievementGrantInput, actors.administrator()))

    override fun revokeAchievement(id: UUID, personId: UUID): ResponseEntity<Unit> {
        actors.administrator()
        service.revoke(id, personId)
        return ResponseEntity.noContent().build()
    }

    override fun listPersonAchievements(id: UUID, page: Int, size: Int): ResponseEntity<PersonAchievementPage> =
        ResponseEntity.ok(service.personPage(id, page, size, actors.optional()))

    override fun readAchievementImage(id: UUID): ResponseEntity<Resource> {
        val row = service.readable(id, actors.optional())
        return ResponseEntity.ok().contentType(MediaType.parseMediaType(row.imageContentType))
            .contentLength(row.imageSize)
            .header(HttpHeaders.CACHE_CONTROL, "private, no-store").header("X-Content-Type-Options", "nosniff")
            .body(store.read(row.imageObjectKey, null))
    }
}
