package com.persons.person.service

import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.person.contract.dto.TagDefinition
import com.persons.person.dao.entity.TagDefinitionEntity
import com.persons.person.dao.repository.TagDefinitionRepository
import com.persons.person.exception.impl.InvalidInputException
import org.springframework.data.domain.Sort
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.Locale

private val TAG_PATTERN = Regex("^[\\p{L}\\p{N}_-]{1,32}$")

@Service
class TagDefinitionService(private val rows: TagDefinitionRepository, private val mapper: ObjectMapper) {
    private val descriptionType = mapper.typeFactory.constructMapType(
        Map::class.java, String::class.java, String::class.java,
    )

    @Transactional(readOnly = true)
    fun all(): List<TagDefinition> = rows.findAll(Sort.by("tag")).stream().map {
        TagDefinition(it.tag, mapper.readValue(it.descriptions, descriptionType))
    }.toList()

    // A replacement and all translated definitions form one atomic dictionary revision.
    @Transactional
    fun replace(input: List<TagDefinition>): List<TagDefinition> {
        val normalized = input.stream().map {
            it.copy(
                tag = it.tag.trim().removePrefix("#").lowercase(Locale.ROOT),
                descriptions = it.descriptions.mapValues { entry -> entry.value.trim() },
            )
        }.toList()
        if (normalized.size > 200 ||
            normalized.stream().map { it.tag }.distinct().count() != normalized.size.toLong() ||
            normalized.stream().anyMatch {
                !TAG_PATTERN.matches(it.tag) ||
                    it.descriptions.isEmpty() ||
                    it.descriptions.keys.any { locale -> locale !in setOf("ru", "en") } ||
                    it.descriptions.values.any { text -> text.isBlank() || text.length > 500 }
            }
        ) {
            throw InvalidInputException()
        }
        rows.deleteAllInBatch()
        rows.saveAll(
            normalized.stream().map {
                TagDefinitionEntity(it.tag, mapper.writeValueAsString(it.descriptions))
            }.toList(),
        )
        rows.flush()
        return all()
    }
}
