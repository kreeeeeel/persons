package com.persons.person.controller

import com.persons.person.component.OwnershipClaimComponent
import com.persons.person.contract.api.ClaimsApi
import com.persons.person.contract.dto.ModerationReceipt
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.multipart.MultipartFile
import java.util.UUID

@RestController
class ClaimsController(private val claims: OwnershipClaimComponent) : ClaimsApi {
    override fun claimPerson(id: UUID, message: String, file: MultipartFile): ResponseEntity<ModerationReceipt> =
        ResponseEntity.accepted().body(claims.submit(id, message, file))
}
