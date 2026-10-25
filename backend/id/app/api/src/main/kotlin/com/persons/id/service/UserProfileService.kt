package com.persons.id.service

import com.persons.id.contract.dto.UserProfile
import com.persons.id.dao.repository.AccountRepository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import java.util.UUID
import java.util.stream.Collectors

@Service
class UserProfileService(private val accounts: AccountRepository) {
    @Transactional(readOnly = true)
    fun profiles(ids: List<UUID>): List<UserProfile> = accounts.findAllById(ids).stream().map { account ->
        UserProfile(
            account.id,
            listOf(account.firstName, account.lastName).stream().filter { it.isNotBlank() }
                .collect(Collectors.joining(" ")),
            account.avatar != null || account.avatarObjectKey != null,
            account.version ?: 0,
        )
    }.toList()
}
