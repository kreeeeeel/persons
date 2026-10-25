package com.persons.gateway.component

import com.persons.gateway.exception.impl.ForbiddenException
import com.persons.person.contract.dto.RestrictionScope
import org.springframework.stereotype.Component
import org.springframework.util.AntPathMatcher

private val READ_METHODS = setOf("GET", "HEAD", "OPTIONS")
private val REACTION_PATHS = listOf(
    "/v1/moments/{id}/like", "/v1/media/{id}/reaction",
    "/v1/content/{kind}/{id}/reaction", "/v1/content/{kind}/{id}/like",
)
private val PROFILE_PATHS =
    listOf("/v1/persons", "/v1/persons/mine", "/v1/persons/{id}", "/v1/persons/{id}/ownership-claims")
private val COMMENT_PATHS = listOf("/v1/persons/{id}/comments", "/v1/comments/{id}")
private val LOAN_PATHS = listOf("/v1/persons/{id}/credit", "/v1/credit/{id}")
private val MEDIA_PATHS = listOf("/v1/persons/{id}/media", "/v1/media/{id}", "/v1/media/{id}/details")
private val ACCOUNT_PATHS = listOf("/v1/persons/{id}/views", "/v1/media/{id}/views", "/v1/notifications/read")

@Component
class RoutePolicy {
    private val matcher = AntPathMatcher()

    fun scope(method: String, path: String): RestrictionScope {
        if (method in READ_METHODS) return RestrictionScope.ACCOUNT
        return when {
            path.startsWith("/v1/admin/") -> RestrictionScope.ACCOUNT
            method == "PUT" && matcher.match("/v1/dynamic-properties/registrations/{scope}", path) ->
                RestrictionScope.ACCOUNT
            matches(REACTION_PATHS, path) -> RestrictionScope.REACTIONS
            matches(COMMENT_PATHS, path) -> RestrictionScope.COMMENTS
            matcher.match("/v1/persons/{id}/rating", path) -> RestrictionScope.RATINGS
            matches(LOAN_PATHS, path) -> RestrictionScope.LOANS
            matches(MEDIA_PATHS, path) -> RestrictionScope.MEDIA
            matches(PROFILE_PATHS, path) -> RestrictionScope.PROFILE
            matches(ACCOUNT_PATHS, path) -> RestrictionScope.ACCOUNT
            else -> throw ForbiddenException()
        }
    }

    fun bypassAccountCheck(upstream: String, method: String, path: String): Boolean = when (upstream) {
        "person" -> path == "/v1/access" && method == "GET"
        "id" -> (path in setOf("/v1/me", "/v1/me/avatar") && method in READ_METHODS) ||
            (path == "/v1/sessions/refresh" && method == "POST") ||
            (path == "/v1/sessions" && method in setOf("GET", "DELETE")) ||
            (matcher.match("/v1/sessions/{id}", path) && method == "DELETE")
        else -> false
    }

    private fun matches(patterns: List<String>, path: String): Boolean = patterns.stream().anyMatch {
        matcher.match(it, path)
    }
}
