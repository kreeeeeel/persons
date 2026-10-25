package com.persons.id.service.impl

import com.persons.id.component.AvatarStorage
import com.persons.id.dao.repository.AccountRepository
import com.persons.id.exception.impl.StorageUnavailableException
import com.persons.id.service.AvatarTransferService
import org.slf4j.LoggerFactory
import org.springframework.data.domain.PageRequest
import org.springframework.stereotype.Service
import org.springframework.transaction.support.TransactionTemplate
import java.time.Clock

private const val FIRST_PAGE_INDEX = 0

private const val TRANSFER_BATCH_SIZE = 20
private const val RETRY_DELAY_SECONDS = 60L
private val logger = LoggerFactory.getLogger(AvatarTransferServiceImpl::class.java)

@Service
class AvatarTransferServiceImpl(
    private val accounts: AccountRepository,
    private val storage: AvatarStorage,
    private val transactions: TransactionTemplate,
    private val clock: Clock,
) : AvatarTransferService {
    override fun dispatch() {
        accounts.findPendingAvatars(clock.instant(), PageRequest.of(FIRST_PAGE_INDEX, TRANSFER_BATCH_SIZE)).stream()
            .forEach { pending ->
                val bytes = pending.avatar

                if (bytes != null) {
                    try {
                        val key = storage.put(pending.id, bytes)

                        transactions.executeWithoutResult {
                            val current = accounts.findById(pending.id).orElse(null)

                            if (current != null && current.avatar.contentEquals(bytes)) {
                                current.avatar = null
                                current.avatarObjectKey = key
                                current.avatarNextAttemptAt = null
                                accounts.save(current)
                            }
                        }
                    } catch (exception: StorageUnavailableException) {
                        logger.warn("Avatar storage unavailable for user {}; transfer will be retried", pending.id)
                        transactions.executeWithoutResult {
                            val current = accounts.findById(pending.id).orElse(null)

                            if (current != null && current.avatar != null) {
                                current.avatarNextAttemptAt = clock.instant().plusSeconds(RETRY_DELAY_SECONDS)
                                accounts.save(current)
                            }
                        }
                    }
                }
            }
    }
}
