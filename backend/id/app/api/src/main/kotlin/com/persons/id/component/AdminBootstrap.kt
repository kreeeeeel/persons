package com.persons.id.component

import com.persons.id.configuration.properties.AdminBootstrapProperties
import com.persons.id.service.AdminService
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component

@Component
class AdminBootstrap(private val properties: AdminBootstrapProperties, private val admin: AdminService) {
    @Scheduled(fixedDelayString = "\${project.admin.bootstrap-delay-ms:5000}")
    fun promote() {
        if (properties.bootstrapEmail.isNotBlank()) {
            admin.bootstrap(properties.bootstrapEmail)
        }
    }
}
