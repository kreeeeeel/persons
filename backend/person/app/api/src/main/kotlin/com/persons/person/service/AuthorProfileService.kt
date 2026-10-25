package com.persons.person.service

import com.persons.person.component.AccountProfiles
import com.persons.person.dao.repository.PersonRepository
import com.persons.person.domain.AuthorProfile
import org.springframework.stereotype.Service
import java.util.UUID
import java.util.stream.Collectors

@Service
class AuthorProfileService(private val persons: PersonRepository, private val accounts: AccountProfiles) {
    fun profiles(names: Map<UUID, String>): Map<UUID, AuthorProfile> {
        if (names.isEmpty()) return emptyMap()
        val current = accounts.profiles(names.keys)
        val linked = persons.byOwners(names.keys.toList()).stream()
            .collect(Collectors.toMap({ it.ownerAccountId }, { it }))
        return names.entries.stream().collect(
            Collectors.toMap({ it.key }, {
                val person = linked[it.key]
                val account = current[it.key]
                AuthorProfile(
                    it.key,
                    account?.name ?: it.value.ifBlank {
                        listOfNotNull(person?.firstName, person?.lastName, person?.patronymic).stream()
                            .filter { name -> name.isNotBlank() }.collect(Collectors.joining(" "))
                    },
                    authorTag = person?.tag,
                    authorAvatarUrl = account?.takeIf { profile -> profile.hasAvatar }?.let { profile ->
                        "/api/person/v1/authors/${profile.id}/avatar?v=${profile.version}"
                    },
                )
            }),
        )
    }
}
