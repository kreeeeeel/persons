package com.persons.id.component

import com.persons.id.service.AvatarTransferService
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

private const val TRANSFER_DELAY = "\${project.id.avatar-sync-delay-ms:5000}"

@Component
class AvatarTransferJob(private val transfers: AvatarTransferService) {
    @Scheduled(fixedDelayString = TRANSFER_DELAY, initialDelayString = TRANSFER_DELAY)
    fun dispatch() {
        transfers.dispatch()
    }
}
