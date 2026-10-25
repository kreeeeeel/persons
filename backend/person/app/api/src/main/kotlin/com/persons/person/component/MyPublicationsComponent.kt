package com.persons.person.component

import com.persons.person.contract.dto.MyPublicationPage
import com.persons.person.contract.dto.PublicationKind
import com.persons.person.dao.repository.PersonRepository
import com.persons.person.domain.Actor
import com.persons.person.service.ContentCatalogDao
import com.persons.person.transformer.toSummary
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Isolation
import org.springframework.transaction.annotation.Transactional
import java.util.stream.Collectors
import java.util.stream.Stream

@Component
class MyPublicationsComponent(
    private val catalog: ContentCatalogDao,
    private val persons: PersonRepository,
    private val text: PublicationTextAssembler,
    private val media: PublicationMediaAssembler,
) {
    // The catalog and payloads must describe the same publication snapshot.
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    fun page(actor: Actor, kind: PublicationKind?, query: String, page: Int, size: Int): MyPublicationPage {
        val rows = catalog.authored(actor, kind, query.trim(), page, size)
        val pages = persons.findAllById(rows.content.stream().map { it.personId }.distinct().toList()).stream()
            .collect(Collectors.toMap({ it.id }, { it.toSummary() }))
        val payloads = Stream.concat(
            text.assemble(rows.content, actor, pages).stream(),
            media.assemble(rows.content, actor, pages).stream(),
        ).collect(Collectors.toMap({ "${it.kind}:${it.id}" }, { it }))
        return MyPublicationPage(
            rows.content.stream().map { payloads.getValue("${it.kind}:${it.id}") }.toList(),
            rows.totalElements, page, size,
        )
    }
}
