package com.persons.person

import com.persons.person.component.AccountProfiles
import com.persons.person.dao.entity.PersonEntity
import com.persons.person.dao.repository.PersonRepository
import com.persons.person.service.AuthorProfileService
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`
import java.util.UUID

class AuthorProfileServiceTest {
    @Test
    fun `missing account labels fall back to given name first consistently with account authors`() {
        val owner = UUID.randomUUID()
        val persons = mock(PersonRepository::class.java)
        val accounts = mock(AccountProfiles::class.java)
        `when`(accounts.profiles(setOf(owner))).thenReturn(emptyMap())
        `when`(persons.byOwners(listOf(owner))).thenReturn(
            listOf(PersonEntity(tag = "kirill", firstName = "Кирилл", lastName = "Немтырев", ownerAccountId = owner)),
        )

        val profile = AuthorProfileService(persons, accounts).profiles(mapOf(owner to "")).getValue(owner)

        assertThat(profile.authorName).isEqualTo("Кирилл Немтырев")
        assertThat(profile.authorTag).isEqualTo("kirill")
    }
}
