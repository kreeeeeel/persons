package com.persons.person.controller

import com.persons.person.component.ActorResolver
import com.persons.person.contract.api.TagsApi
import com.persons.person.contract.dto.TagDefinition
import com.persons.person.service.TagDefinitionService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController

@RestController
class TagsController(private val actors: ActorResolver, private val tags: TagDefinitionService) : TagsApi {
    override fun listTagDefinitions(): ResponseEntity<List<TagDefinition>> = ResponseEntity.ok(tags.all())

    override fun updateTagDefinitions(tagDefinition: List<TagDefinition>): ResponseEntity<List<TagDefinition>> {
        actors.administrator()
        return ResponseEntity.ok(tags.replace(tagDefinition))
    }
}
