package com.persons.id.oauth.impl

import com.persons.id.configuration.properties.YandexOAuthProperties
import com.persons.id.exception.impl.InvalidOAuthException
import com.persons.id.exception.impl.OAuthUnavailableException
import com.persons.id.oauth.OAuthIdentity
import com.persons.id.oauth.OAuthProvider
import org.springframework.http.MediaType
import org.springframework.stereotype.Component
import org.springframework.util.LinkedMultiValueMap
import org.springframework.web.client.HttpClientErrorException
import org.springframework.web.client.RestClient
import org.springframework.web.client.RestClientException
import org.springframework.web.util.UriComponentsBuilder
import java.nio.charset.StandardCharsets
import java.security.MessageDigest
import java.util.Base64

private const val PROVIDER_ID = "yandex"
private const val AUTHORIZE_URL = "https://oauth.yandex.ru/authorize"
private const val TOKEN_URL = "https://oauth.yandex.ru/token"
private const val USER_URL = "https://login.yandex.ru/info?format=json"
private const val SCOPES = "login:info login:email"
private const val SHA_256 = "SHA-256"
private const val EMAIL_LIMIT = 254
private const val NAME_LIMIT = 80
private const val SUBJECT_LIMIT = 128

@Component
class YandexOAuthProvider(private val properties: YandexOAuthProperties, private val client: RestClient) :
    OAuthProvider {
    override val id: String = PROVIDER_ID

    override fun authorizationUrl(state: String, verifier: String): String {
        if (properties.clientId.isBlank() || properties.clientSecret.isBlank()) {
            throw OAuthUnavailableException()
        }

        val challenge = Base64.getUrlEncoder().withoutPadding().encodeToString(
            MessageDigest.getInstance(SHA_256).digest(verifier.toByteArray(StandardCharsets.US_ASCII)),
        )

        return UriComponentsBuilder.fromUriString(AUTHORIZE_URL)
            .queryParam("response_type", "code")
            .queryParam("client_id", properties.clientId)
            .queryParam("redirect_uri", properties.redirectUri)
            .queryParam("scope", SCOPES)
            .queryParam("state", state)
            .queryParam("code_challenge", challenge)
            .queryParam("code_challenge_method", "S256")
            .build().encode().toUriString()
    }

    override fun identify(code: String, verifier: String): OAuthIdentity {
        val form = LinkedMultiValueMap<String, String>()

        form.add("grant_type", "authorization_code")
        form.add("code", code)
        form.add("client_id", properties.clientId)
        form.add("client_secret", properties.clientSecret)
        form.add("code_verifier", verifier)

        try {
            val token = client.post().uri(TOKEN_URL).contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(form).retrieve().body(YandexTokenResponse::class.java)

            if (token == null || token.accessToken.isBlank()) {
                throw InvalidOAuthException()
            }

            val user = client.get().uri(USER_URL).header("Authorization", "OAuth ${token.accessToken}")
                .retrieve().body(YandexUserResponse::class.java)
            val email = user?.email?.trim()?.lowercase()

            if (user == null ||
                user.id.isBlank() ||
                user.id.length > SUBJECT_LIMIT ||
                email.isNullOrBlank() ||
                email.length > EMAIL_LIMIT ||
                !email.matches(Regex("[^@\\s]+@[^@\\s]+\\.[^@\\s]+"))
            ) {
                throw InvalidOAuthException()
            }

            return OAuthIdentity(user.id, email, user.firstName.take(NAME_LIMIT), user.lastName.take(NAME_LIMIT))
        } catch (exception: HttpClientErrorException) {
            throw InvalidOAuthException(exception)
        } catch (exception: RestClientException) {
            throw OAuthUnavailableException(exception)
        }
    }
}
