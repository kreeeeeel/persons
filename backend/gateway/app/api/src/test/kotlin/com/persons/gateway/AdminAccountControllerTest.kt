package com.persons.gateway

import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.gateway.component.AdminAccountGateway
import com.persons.gateway.component.RestrictionsGateway
import com.persons.gateway.controller.AdminAccountController
import com.persons.gateway.exception.GatewayExceptionHandler
import com.persons.id.client.generated.api.AdminApi
import com.persons.id.client.generated.model.AdminUsers
import com.persons.person.contract.dto.AccountRole
import com.persons.person.contract.dto.AccountStatus
import com.persons.person.contract.dto.UpdateAccess
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.verify
import org.mockito.Mockito.`when`
import org.springframework.http.HttpHeaders
import org.springframework.web.reactive.function.client.WebClientResponseException
import reactor.core.publisher.Mono
import java.nio.charset.StandardCharsets
import java.util.UUID

class AdminAccountControllerTest {
    private val gateway = mock(AdminAccountGateway::class.java)
    private val api = mock(AdminApi::class.java)
    private val restrictions = mock(RestrictionsGateway::class.java)
    private val controller = AdminAccountController(gateway, restrictions)

    @Test
    fun `forwards account pagination through the authorized ID gateway`() {
        `when`(gateway.api()).thenReturn(api)
        `when`(api.listAdminUsers(0, 20, null)).thenReturn(Mono.just(AdminUsers(emptyList(), 0, 0, 20)))
        `when`(restrictions.lookup(emptyList())).thenReturn(emptyMap())
        val response = controller.listAdminUsers(0, 20, null)
        assertThat(response.statusCode.value()).isEqualTo(200)
        assertThat(response.body?.propertySize).isEqualTo(20)
        verify(gateway).api()
    }

    @Test
    fun `forwards session revocation and returns no content`() {
        val id = UUID.randomUUID()
        `when`(gateway.api()).thenReturn(api)
        `when`(api.revokeUserSessions(id)).thenReturn(Mono.empty())
        assertThat(controller.revokeUserSessions(id).statusCode.value()).isEqualTo(204)
        verify(api).revokeUserSessions(id)
    }

    @Test
    fun `forwards active session IP details and disables response caching`() {
        val id = UUID.randomUUID()
        val now = java.time.OffsetDateTime.parse("2026-10-21T12:00:00Z")
        val session = com.persons.id.client.generated.model.Session(
            id = UUID.randomUUID(), createdAt = now, lastSeenAt = now, expiresAt = now.plusDays(1),
            ip = "203.0.113.7", userAgent = "Chrome", os = "Windows", osVersion = "11", browser = "Chrome",
            device = "desktop", origin = "persons-person-web", current = false, region = "Test region",
        )
        `when`(gateway.api()).thenReturn(api)
        `when`(api.listUserSessions(id)).thenReturn(
            Mono.just(com.persons.id.client.generated.model.Sessions(listOf(session))),
        )

        val response = controller.listUserSessions(id)

        assertThat(response.headers.cacheControl).isEqualTo("private, no-store")
        assertThat(response.body?.items?.single()?.ip).isEqualTo("203.0.113.7")
        assertThat(response.body?.items?.single()?.lastSeenAt).isEqualTo(now)
        verify(api).listUserSessions(id)
    }

    @Test
    fun `delegates access changes to the canonical policy owner`() {
        val id = UUID.randomUUID()
        val change = UpdateAccess(AccountRole.USER, AccountStatus.ACTIVE)
        val expected = com.persons.person.contract.dto.AdminUser(
            id, "user@example.test", "User", "Test", AccountRole.USER, AccountStatus.ACTIVE,
            java.time.OffsetDateTime.parse("2026-10-20T00:00:00Z"),
        )
        `when`(restrictions.updateAccess(id, change)).thenReturn(expected)
        assertThat(controller.updateUserAccess(id, change).body).isEqualTo(expected)
        verify(restrictions).updateAccess(id, change)
        org.mockito.Mockito.verifyNoInteractions(gateway)
    }

    @Test
    fun `preserves a known upstream error and hides unknown response details`() {
        val handler = GatewayExceptionHandler(ObjectMapper())
        val known = upstream(409, "LAST_ADMINISTRATOR")
        assertThat(handler.upstream(known).statusCode.value()).isEqualTo(409)
        assertThat(handler.upstream(known).body?.code).isEqualTo("LAST_ADMINISTRATOR")
        val unknown = handler.upstream(upstream(500, "INTERNAL_DATABASE_FAILURE"))
        assertThat(unknown.statusCode.value()).isEqualTo(503)
        assertThat(unknown.body?.code).isEqualTo("UNAVAILABLE")
    }

    @Test
    fun `forwards administrator name updates and preserves the patronymic in the response`() {
        val id = UUID.randomUUID()
        val update = com.persons.person.contract.dto.UserProfileUpdate("Ivan", "Petrov", "Ivanovich")
        val expected = com.persons.id.client.generated.model.ChangeProfile("Ivan", "Petrov", "Ivanovich")
        val user = com.persons.id.client.generated.model.AdminUser(
            id, "user@example.test", "Ivan", "Petrov",
            com.persons.id.client.generated.model.AccountRole.USER,
            com.persons.id.client.generated.model.AccountStatus.ACTIVE,
            java.time.OffsetDateTime.parse("2026-10-21T12:00:00Z"),
            patronymic = "Ivanovich",
        )
        `when`(gateway.api()).thenReturn(api)
        `when`(api.updateUserProfile(id, expected)).thenReturn(Mono.just(user))

        val response = controller.updateUserProfile(id, update)

        assertThat(response.body?.patronymic).isEqualTo("Ivanovich")
        assertThat(response.body?.email).isEqualTo("user@example.test")
        assertThat(response.headers.cacheControl).isEqualTo("private, no-store")
        verify(api).updateUserProfile(id, expected)
    }

    private fun upstream(status: Int, code: String) = WebClientResponseException.create(
        status, "Failure", HttpHeaders.EMPTY,
        "{\"code\":\"$code\"}".toByteArray(StandardCharsets.UTF_8), StandardCharsets.UTF_8,
    )
}
