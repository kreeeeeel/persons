package com.persons.person.service

import com.persons.person.contract.dto.PersonSummary
import com.persons.person.dao.entity.MediaPersonTagEntity
import com.persons.person.dao.repository.MediaPersonTagRepository
import com.persons.person.dao.repository.PersonRepository
import com.persons.person.exception.impl.InvalidInputException
import com.persons.person.transformer.toSummary
import org.springframework.stereotype.Service
import java.util.UUID

private const val MAX_TAGS = 20

@Service
class MediaTagService(private val tags: MediaPersonTagRepository, private val persons: PersonRepository) {
    fun validate(ids: List<UUID>): List<UUID> {
        if (ids.size > MAX_TAGS) {
            throw InvalidInputException()
        }
        val unique = ids.stream().distinct().sorted().toList()
        val rows = persons.findAllById(unique)
        if (rows.size != unique.size || rows.stream().anyMatch { it.deleted || !it.published }) {
            throw InvalidInputException()
        }
        return unique
    }

    fun replace(mediaId: UUID, ids: List<UUID>) {
        val unique = validate(ids)
        tags.deleteAllInBatch(tags.byMedia(mediaId))
        tags.saveAll(unique.stream().map { MediaPersonTagEntity(mediaId = mediaId, personId = it) }.toList())
    }

    fun summariesFor(ids: List<UUID>): List<PersonSummary> = persons.findAllById(ids).stream()
        .filter { !it.deleted && it.published }.map { it.toSummary() }.toList()

    fun summaries(mediaId: UUID): List<PersonSummary> = persons.findAllById(
        tags.byMedia(mediaId).stream().map { it.personId }.toList(),
    ).stream().filter { !it.deleted && it.published }.map { it.toSummary() }.toList()
}
