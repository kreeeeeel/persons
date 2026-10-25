package com.persons.id

import com.persons.id.configuration.properties.YandexOAuthProperties
import com.persons.id.exception.impl.InvalidOAuthException
import com.persons.id.exception.impl.OAuthUnavailableException
import com.persons.id.oauth.impl.YandexOAuthProvider
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.hamcrest.Matchers.containsString
import org.junit.jupiter.api.Test
import org.springframework.http.HttpMethod
import org.springframework.http.MediaType
import org.springframework.test.web.client.MockRestServiceServer
import org.springframework.test.web.client.match.MockRestRequestMatchers.content
import org.springframework.test.web.client.match.MockRestRequestMatchers.header
import org.springframework.test.web.client.match.MockRestRequestMatchers.method
import org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo
import org.springframework.test.web.client.response.MockRestResponseCreators.withBadRequest
import org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess
import org.springframework.web.client.RestClient
import org.springframework.web.util.UriComponentsBuilder
import java.security.MessageDigest
import java.util.Base64

private const val VERIFIER = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"

class YandexOAuthProviderTest {
    @Test
    fun `authorization binds state callback and an S256 PKCE challenge`() {
        val provider = YandexOAuthProvider(properties(), RestClient.create())
        val query = UriComponentsBuilder.fromUriString(provider.authorizationUrl("state-123", VERIFIER))
            .build().queryParams
        val challenge = Base64.getUrlEncoder().withoutPadding().encodeToString(
            MessageDigest.getInstance("SHA-256").digest(VERIFIER.toByteArray()),
        )

        assertThat(query.getFirst("state")).isEqualTo("state-123")
        assertThat(query.getFirst("code_challenge_method")).isEqualTo("S256")
        assertThat(query.getFirst("code_challenge")).isEqualTo(challenge)
        assertThat(query.getFirst("client_id")).isEqualTo("client-id")
    }

    @Test
    fun `token exchange sends the verifier and uses OAuth authorization for identity`() {
        val builder = RestClient.builder()
        val server = MockRestServiceServer.bindTo(builder).build()
        val provider = YandexOAuthProvider(properties(), builder.build())

        server.expect(requestTo("https://oauth.yandex.ru/token"))
            .andExpect(method(HttpMethod.POST))
            .andExpect(content().string(containsString("code_verifier=$VERIFIER")))
            .andRespond(withSuccess("""{"access_token":"private-access-token"}""", MediaType.APPLICATION_JSON))
        server.expect(requestTo("https://login.yandex.ru/info?format=json"))
            .andExpect(header("Authorization", "OAuth private-access-token"))
            .andRespond(
                withSuccess(
                    """{"id":"stable-id","default_email":"Friend@Example.test","first_name":"Friend"}""",
                    MediaType.APPLICATION_JSON,
                ),
            )

        val identity = provider.identify("authorization-code", VERIFIER)

        assertThat(identity.subject).isEqualTo("stable-id")
        assertThat(identity.email).isEqualTo("friend@example.test")
        server.verify()
    }

    @Test
    fun `a rejected authorization code cannot become a session`() {
        val builder = RestClient.builder()
        val server = MockRestServiceServer.bindTo(builder).build()
        val provider = YandexOAuthProvider(properties(), builder.build())

        server.expect(requestTo("https://oauth.yandex.ru/token")).andRespond(withBadRequest())
        assertThatThrownBy { provider.identify("expired-code", VERIFIER) }
            .isInstanceOf(InvalidOAuthException::class.java)
        server.verify()
    }

    @Test
    fun `unconfigured provider fails without a redirect`() {
        val provider = YandexOAuthProvider(YandexOAuthProperties(), RestClient.create())

        assertThatThrownBy { provider.authorizationUrl("state", VERIFIER) }
            .isInstanceOf(OAuthUnavailableException::class.java)
    }

    private fun properties(): YandexOAuthProperties =
        YandexOAuthProperties(clientId = "client-id", clientSecret = "secret")
}
