package com.persons.person.controller

import com.persons.person.component.ActorResolver
import com.persons.person.contract.api.SiteSettingsApi
import com.persons.person.contract.dto.SiteSettings
import com.persons.person.service.SiteSettingsService
import org.springframework.http.CacheControl
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.RestController

@RestController
class SiteSettingsController(private val actors: ActorResolver, private val settings: SiteSettingsService) :
    SiteSettingsApi {
    override fun getSiteSettings(): ResponseEntity<SiteSettings> =
        ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(settings.current())

    override fun getAdminSiteSettings(): ResponseEntity<SiteSettings> {
        actors.administrator()

        return getSiteSettings()
    }

    override fun updateSiteSettings(siteSettings: SiteSettings): ResponseEntity<SiteSettings> =
        ResponseEntity.ok().cacheControl(CacheControl.noStore())
            .body(settings.update(siteSettings, actors.administrator()))
}
