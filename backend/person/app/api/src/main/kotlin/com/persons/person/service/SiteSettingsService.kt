package com.persons.person.service

import com.persons.dynamicproperties.DynPropertyFactory
import com.persons.dynamicproperties.component.DynPropertyService
import com.persons.person.contract.dto.SiteSettings
import com.persons.person.domain.Actor
import com.persons.person.exception.impl.ForbiddenException
import org.springframework.stereotype.Service

@Service
class SiteSettingsService(private val properties: DynPropertyService) {
    private val marquee = DynPropertyFactory.createBoolean("site.marqueeEnabled", true)
        .description("Показывать бегущую строку").publicValue().build()
    private val email = DynPropertyFactory.createEmail("legal.supportEmail")
        .description("Почта для обращений").publicValue().build()
    private val operators = DynPropertyFactory.createLocalizedStrings(
        "legal.operatorNames",
        mapOf(
            "ru" to "",
            "en" to "",
        ),
    )
        .description("Сведения об операторе по языкам").publicValue().build()
    private val catalogSize = DynPropertyFactory.createInteger("catalog.pageSize", 12, 1, 60)
        .description("Количество карточек на странице каталога").publicValue().build()
    private val notices = DynPropertyFactory.createLocalizedStringLists(
        "site.noticeTexts",
        mapOf(
            "ru" to
                listOf(
                    "Все персонажи вымышленные, совпадения случайны",
                    "На сайте используется контент, созданный с помощью ИИ",
                ),
            "en" to
                listOf(
                    "All characters are fictional; any resemblance is coincidental",
                    "This site uses AI-generated content",
                ),
        ),
    ).description("Тексты бегущей строки по языкам").publicValue().build()

    fun current(): SiteSettings = SiteSettings(
        marqueeEnabled = marquee.value, supportEmail = email.value, catalogPageSize = catalogSize.value,
        operatorNames = operators.value, noticeTexts = notices.value,
    )

    fun update(input: SiteSettings, actor: Actor): SiteSettings {
        if (!actor.administrator) {
            throw ForbiddenException()
        }
        properties.update("site.marqueeEnabled", input.marqueeEnabled.toString(), null, actor.id.toString())
        return current()
    }
}
