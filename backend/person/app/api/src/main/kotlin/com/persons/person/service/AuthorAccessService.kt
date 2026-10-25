package com.persons.person.service

import com.persons.person.dao.repository.AuthorRepository
import com.persons.person.exception.impl.NotFoundException
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID

@Service
class AuthorAccessService(private val authors: AuthorRepository) {
    @Transactional(readOnly = true)
    fun requireParticipant(id: UUID) {
        if (!authors.participates(id)) throw NotFoundException()
    }
}
