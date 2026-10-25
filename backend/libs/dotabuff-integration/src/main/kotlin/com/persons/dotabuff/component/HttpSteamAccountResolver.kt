package com.persons.dotabuff.component

import com.persons.dotabuff.SteamAccountResolver
import com.persons.dotabuff.exception.DotabuffException
import org.jsoup.Jsoup
import org.jsoup.parser.Parser
import java.net.URI
import java.net.URISyntaxException

private const val STEAM_BASE = 76561197960265728L
private const val MAX_ACCOUNT = 4294967295L
private val profilePath = Regex("^/(profiles|id)/([a-zA-Z0-9_-]{1,64})/?$")

class HttpSteamAccountResolver(
    private val http: DotabuffHttp,
) : SteamAccountResolver {
    override fun resolve(profileUrl: String): Long {
        val uri =
            try {
                URI(profileUrl)
            } catch (exception: URISyntaxException) {
                throw DotabuffException("INVALID_STEAM_PROFILE", cause = exception)
            }
        val path = profilePath.matchEntire(uri.path.orEmpty())
        if (uri.scheme != "https" ||
            uri.host != "steamcommunity.com" ||
            uri.port != -1 ||
            uri.userInfo != null ||
            uri.query != null ||
            uri.fragment != null ||
            path == null
        ) {
            throw DotabuffException("INVALID_STEAM_PROFILE")
        }
        val value = path.groupValues[2]
        val steamId =
            if (path.groupValues[1] == "profiles") {
                value.toLongOrNull()
            } else {
                val xml = http.steam("/id/$value/?xml=1")
                Jsoup
                    .parse(xml, "", Parser.xmlParser())
                    .selectFirst("steamID64")
                    ?.text()
                    ?.toLongOrNull()
            }
        val account = steamId?.minus(STEAM_BASE)
        if (account == null || account !in 1..MAX_ACCOUNT) {
            throw DotabuffException("STEAM_PROFILE_UNAVAILABLE")
        }
        return account
    }
}
