package com.persons.person.component

import com.persons.person.contract.dto.ProfileInput
import com.persons.person.contract.dto.SocialLink
import com.persons.person.contract.dto.SocialNetwork
import com.persons.person.exception.impl.InvalidInputException
import org.springframework.stereotype.Component
import java.net.URI
import java.net.URISyntaxException
import java.util.Locale

private val RESERVED_TAGS = setOf("ru", "en", "api", "media", "assets", "person", "admin", "my-page", "blocked")
private val TAG_PATTERN = Regex("^[a-z][a-z0-9-]{1,31}$")
private val KEYWORD_WHITESPACE = Regex("\\s+")
private const val MAX_SEARCH_KEYWORDS = 20
private const val MAX_SEARCH_KEYWORD_LENGTH = 80
private val DISCORD_TAG_PATTERN = Regex("^(?:[a-z0-9_.]{2,32}|[^#\\s]{2,32}#[0-9]{4})$")
private val SOCIAL_HOSTS = mapOf(
    SocialNetwork.TELEGRAM to setOf("t.me"),
    SocialNetwork.STEAM to setOf("steamcommunity.com"),
    SocialNetwork.DISCORD to setOf("discord.com"),
)

@Component
class ProfileValidator {
    fun normalize(input: ProfileInput): ProfileInput {
        val normalized = input.copy(
            firstName = input.firstName.trim(),
            lastName = input.lastName.trim(),
            patronymic = input.patronymic?.trim()?.ifEmpty { null },
            description = input.description.trim(),
            tags = input.tags.stream().map(String::trim).toList(),
            searchKeywords = input.searchKeywords?.stream()
                ?.map { it.trim().replace(KEYWORD_WHITESPACE, " ").lowercase(Locale.ROOT) }
                ?.distinct()?.toList(),
            socialLinks = input.socialLinks.stream().map {
                it.copy(
                    url = it.url?.trim(),
                    tag = it.tag?.trim()?.removePrefix("@")?.let { tag ->
                        if ('#' in tag) tag else tag.lowercase(Locale.ROOT)
                    },
                )
            }.toList(),
            ratingOptions = input.ratingOptions.stream().map {
                it.copy(emoji = it.emoji.trim(), label = it.label.trim())
            }
                .toList(),
        )

        if (!TAG_PATTERN.matches(normalized.tag) ||
            normalized.tag in RESERVED_TAGS ||
            normalized.firstName.isBlank() ||
            normalized.tags.stream().anyMatch { it.isBlank() } ||
            normalized.tags.stream().map { it.lowercase(Locale.ROOT) }.distinct().count() !=
            normalized.tags.size.toLong() ||
            normalized.ratingOptions.isEmpty() ||
            normalized.ratingOptions.stream().anyMatch { it.emoji.isBlank() || it.label.isBlank() } ||
            normalized.ratingOptions.stream().map { it.emoji }.distinct().count() !=
            normalized.ratingOptions.size.toLong() ||
            normalized.socialLinks.stream().map { it.network }.distinct().count() !=
            normalized.socialLinks.size.toLong()
        ) {
            throw InvalidInputException()
        }

        normalized.socialLinks.stream().forEach(::validateSocial)
        normalized.searchKeywords?.let { keywords ->
            if (keywords.size > MAX_SEARCH_KEYWORDS ||
                keywords.stream().anyMatch { it.isBlank() || it.length > MAX_SEARCH_KEYWORD_LENGTH }
            ) {
                throw InvalidInputException()
            }
        }

        return normalized
    }

    private fun validateSocial(link: SocialLink) {
        val tag = link.tag
        if (link.network == SocialNetwork.DISCORD && tag != null) {
            if (link.url != null || !DISCORD_TAG_PATTERN.matches(tag) || ('#' !in tag && ".." in tag)) {
                throw InvalidInputException()
            }
            return
        }
        val url = link.url
        if (tag != null || url == null) throw InvalidInputException()
        val uri = try {
            URI(url)
        } catch (exception: URISyntaxException) {
            throw InvalidInputException(cause = exception)
        }

        if (uri.scheme != "https" ||
            uri.host?.lowercase(Locale.ROOT) !in SOCIAL_HOSTS[link.network].orEmpty() ||
            uri.userInfo != null ||
            uri.port != -1 ||
            uri.path.isNullOrBlank() ||
            uri.path == "/"
        ) {
            throw InvalidInputException()
        }
    }
}
