package com.persons.person.controller

import com.persons.person.component.ActorResolver
import com.persons.person.contract.api.NotificationsApi
import com.persons.person.contract.dto.NotificationPage
import com.persons.person.service.NotificationService
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController

@RestController
class NotificationsController(private val actors: ActorResolver, private val notifications: NotificationService) :
    NotificationsApi {
    override fun listNotifications(page: Int, size: Int): ResponseEntity<NotificationPage> =
        ResponseEntity.ok(notifications.page(actors.required().id, page, size))

    override fun readNotifications(): ResponseEntity<Unit> {
        notifications.markRead(actors.required().id)

        return ResponseEntity.noContent().build()
    }
}
