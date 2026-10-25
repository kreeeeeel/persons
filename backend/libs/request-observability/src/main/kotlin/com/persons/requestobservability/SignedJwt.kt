package com.persons.requestobservability

import com.nimbusds.jose.JOSEException
import com.nimbusds.jose.JWSAlgorithm
import com.nimbusds.jose.JWSHeader
import com.nimbusds.jose.crypto.MACSigner
import com.nimbusds.jose.crypto.MACVerifier
import com.nimbusds.jwt.JWTClaimsSet
import com.nimbusds.jwt.SignedJWT
import java.text.ParseException
import java.time.Instant
import java.util.Date
import java.util.UUID

private const val SERVICE_TOKEN_TTL_SECONDS = 60L
private const val MAX_TOKEN_LENGTH = 4096
private const val JWT_CLOCK_SKEW_SECONDS = 30L

class SignedJwt(private val secret: String) {
    fun issue(
        subject: String,
        audience: String,
        scope: String,
        now: Instant,
        expiresAt: Instant,
        id: String = UUID.randomUUID().toString(),
    ): String {
        val claims = JWTClaimsSet.Builder()
            .issuer("persons")
            .subject(subject)
            .audience(audience)
            .claim("scope", scope)
            .issueTime(Date.from(now))
            .expirationTime(Date.from(expiresAt))
            .jwtID(id)
            .build()
        val token =
            SignedJWT(JWSHeader.Builder(JWSAlgorithm.HS256).type(com.nimbusds.jose.JOSEObjectType.JWT).build(), claims)

        token.sign(MACSigner(secret))

        return token.serialize()
    }

    fun service(subject: String): String {
        val now = Instant.now()

        return issue(subject, "persons-internal", "service", now, now.plusSeconds(SERVICE_TOKEN_TTL_SECONDS))
    }

    fun verify(token: String, audience: String, scope: String, now: Instant = Instant.now()): JWTClaimsSet? {
        if (token.length > MAX_TOKEN_LENGTH) {
            return null
        }

        return try {
            val jwt = SignedJWT.parse(token)
            val claims = jwt.jwtClaimsSet

            if (jwt.header.algorithm != JWSAlgorithm.HS256 ||
                !jwt.verify(MACVerifier(secret)) ||
                claims.issuer != "persons" ||
                !claims.audience.contains(audience) ||
                claims.getStringClaim("scope") != scope ||
                claims.subject.isNullOrBlank() ||
                claims.jwtid.isNullOrBlank() ||
                claims.expirationTime?.toInstant()?.isAfter(now) != true ||
                claims.issueTime?.toInstant()?.isAfter(
                    now.plusSeconds(JWT_CLOCK_SKEW_SECONDS),
                ) !=
                false
            ) {
                null
            } else {
                claims
            }
        } catch (exception: ParseException) {
            null
        } catch (exception: JOSEException) {
            null
        }
    }
}
