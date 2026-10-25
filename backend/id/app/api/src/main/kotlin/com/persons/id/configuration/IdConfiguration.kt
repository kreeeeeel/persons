package com.persons.id.configuration

import com.persons.i18n.client.configuration.I18nMainClientConfiguration
import com.persons.id.configuration.properties.AdminBootstrapProperties
import com.persons.id.configuration.properties.IdProperties
import com.persons.id.configuration.properties.YandexOAuthProperties
import com.persons.idcontext.IdContextConfiguration
import com.persons.mail.client.configuration.MailMainClientConfiguration
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Import
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.security.crypto.password.PasswordEncoder
import java.time.Clock

private const val PASSWORD_HASH_STRENGTH = 12

@Configuration
@EnableConfigurationProperties(
    IdProperties::class,
    YandexOAuthProperties::class,
    AdminBootstrapProperties::class,
)
@Import(IdContextConfiguration::class, MailMainClientConfiguration::class, I18nMainClientConfiguration::class)
class IdConfiguration {
    @Bean
    fun passwordEncoder(): PasswordEncoder = BCryptPasswordEncoder(PASSWORD_HASH_STRENGTH)

    @Bean
    fun clock(): Clock = Clock.systemUTC()
}
