package com.persons.person.service

import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.repository.PersonRepository
import com.persons.person.domain.Actor
import com.persons.person.exception.impl.ForbiddenException
import com.persons.person.exception.impl.NotFoundException
import org.springframework.stereotype.Service
import java.util.UUID

@Service
class PersonAccessService(private val persons: PersonRepository) {
    fun visible(id: UUID, actor: Actor? = null): PersonEntity = visible(persons.findById(id).orElse(null), actor)

    fun byTag(tag: String, actor: Actor?): PersonEntity = visible(persons.byTag(tag), actor)

    fun locked(id: UUID): PersonEntity {
        val person = persons.locked(id) ?: throw NotFoundException()

        if (person.deleted) {
            throw NotFoundException()
        }

        return person
    }

    fun requireEditor(person: PersonEntity, actor: Actor) {
        if (!canEdit(person, actor)) {
            throw ForbiddenException()
        }
    }

    fun canEdit(person: PersonEntity, actor: Actor?): Boolean =
        actor != null && (actor.administrator || person.ownerAccountId == actor.id)

    private fun visible(person: PersonEntity?, actor: Actor?): PersonEntity {
        if (person == null || person.deleted || (!person.published && !canEdit(person, actor))) {
            throw NotFoundException()
        }

        return person
    }
}
