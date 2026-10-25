package com.persons.restrictions.component

import com.fasterxml.jackson.core.JsonProcessingException
import com.fasterxml.jackson.databind.ObjectMapper
import com.persons.restrictions.configuration.properties.CacheProperties
import com.persons.restrictions.domain.Restriction
import org.slf4j.LoggerFactory
import org.springframework.dao.DataAccessException
import org.springframework.data.redis.core.StringRedisTemplate
import org.springframework.stereotype.Component
import java.time.Clock
import java.time.Duration
import java.util.UUID

private const val KEY_PREFIX = "persons:restrictions:v1:"
private val logger = LoggerFactory.getLogger(RestrictionCache::class.java)

@Component
class RestrictionCache(
    private val redis: StringRedisTemplate,
    private val json: ObjectMapper,
    private val properties: CacheProperties,
    private val clock: Clock,
) {
    fun get(userId: UUID, revision: Long): Restriction? = try {
        val value = redis.opsForValue().get(key(userId, revision))
        if (value == null) {
            null
        } else {
            val snapshot: Restriction? = json.readValue(value, Restriction::class.java)
            snapshot?.takeIf {
                it.userId == userId && it.revision == revision
            }
        }
    } catch (exception: DataAccessException) {
        logger.warn("Restriction cache read failed; reading database: {}", exception.javaClass.simpleName)
        null
    } catch (exception: JsonProcessingException) {
        logger.warn("Invalid restriction cache entry; reading database")
        null
    }

    fun put(restriction: Restriction) {
        val remaining = if (restriction.revoked) {
            null
        } else {
            restriction.expiresAt?.let {
                Duration.between(clock.instant(), it)
            }
        }
        val ttl = if (remaining != null && remaining < properties.ttl) remaining else properties.ttl
        if (ttl.isNegative || ttl.isZero) return
        try {
            redis.opsForValue().set(
                key(restriction.userId, restriction.revision),
                json.writeValueAsString(restriction),
                ttl,
            )
        } catch (exception: DataAccessException) {
            logger.warn(
                "Restriction cache write failed; database remains authoritative: {}",
                exception.javaClass.simpleName,
            )
        } catch (exception: JsonProcessingException) {
            logger.warn("Restriction cache serialization failed; reading database")
        }
    }

    private fun key(userId: UUID, revision: Long): String = "$KEY_PREFIX$userId:$revision"
}
