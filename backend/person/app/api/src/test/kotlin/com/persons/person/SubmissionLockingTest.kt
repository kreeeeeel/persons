package com.persons.person

import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.person.contract.dto.CommentInput
import com.persons.person.contract.dto.CreditInput
import com.persons.person.contract.dto.CreditKind
import com.persons.person.contract.dto.ModerationReceipt
import com.persons.person.contract.dto.ModerationStatus
import com.persons.person.dao.entity.CommentEntity
import com.persons.person.dao.entity.CreditEntryEntity
import com.persons.person.dao.entity.ModerationEntity
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.repository.CommentRepository
import com.persons.person.dao.repository.CreditEntryRepository
import com.persons.person.dao.repository.ModerationRepository
import com.persons.person.domain.Actor
import com.persons.person.domain.ChangeKind
import com.persons.person.service.CommentService
import com.persons.person.service.CreditService
import com.persons.person.service.ModerationQueueService
import com.persons.person.service.PersonAccessService
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import java.time.Clock
import java.util.UUID

private inline fun <reified T : Any> mock(): T = Mockito.mock(T::class.java)

class SubmissionLockingTest {
    private val person = PersonEntity(published = true)
    private val actor = Actor(UUID.randomUUID(), "Автор", false)
    private val access = mock<PersonAccessService>()
    private val clock = Clock.systemUTC()

    @Test
    fun `locks persona before inserting a comment with a foreign key`() {
        authenticate()
        val comments = mock<CommentRepository>()
        val service = CommentService(
            mock(), comments, mock(), mock(), mock(), access, queue(), clock, mock(), mock(),
        )
        service.propose(person.id, CommentInput("Комментарий"), actor)

        val order = Mockito.inOrder(access, comments)
        order.verify(access).locked(person.id)
        order.verify(comments).save(Mockito.any(CommentEntity::class.java) ?: CommentEntity())
    }

    @Test
    fun `locks persona before inserting a loan and queuing its publication`() {
        authenticate()
        val entries = mock<CreditEntryRepository>()
        val service = CreditService(mock(), entries, access, queue(), clock, mock(), mock(), mock())
        service.propose(person.id, CreditInput(CreditKind.ON_TIME, "Возвращает вовремя"), actor)

        val order = Mockito.inOrder(access, entries)
        order.verify(access).locked(person.id)
        order.verify(entries).save(Mockito.any(CreditEntryEntity::class.java) ?: CreditEntryEntity())
    }

    @Test
    fun `locks persona before a queue query can flush pending foreign key inserts`() {
        authenticate()
        val requests = mock<ModerationRepository>()
        Mockito.`when`(requests.save(Mockito.any(ModerationEntity::class.java) ?: ModerationEntity()))
            .thenAnswer { it.arguments[0] }
        val service = ModerationQueueService(requests, ObjectMapper(), clock, mock(), access, mock())
        val target = UUID.randomUUID()
        service.submit(person, target, ChangeKind.DELETE_COMMENT, actor, "Удаление")

        val order = Mockito.inOrder(access, requests)
        order.verify(access).locked(person.id)
        order.verify(requests).pendingForTarget(target, ChangeKind.DELETE_COMMENT)
        order.verify(requests).save(Mockito.any(ModerationEntity::class.java) ?: ModerationEntity())
    }

    private fun authenticate() {
        Mockito.`when`(access.locked(person.id)).thenReturn(person)
        Mockito.`when`(access.visible(person.id, actor)).thenReturn(person)
    }

    private fun queue(): ModerationQueueService = Mockito.mock(ModerationQueueService::class.java) { invocation ->
        if (invocation.method.name == "submit") {
            ModerationReceipt(UUID.randomUUID(), ModerationStatus.PENDING)
        } else {
            Mockito.RETURNS_DEFAULTS.answer(invocation)
        }
    }
}
