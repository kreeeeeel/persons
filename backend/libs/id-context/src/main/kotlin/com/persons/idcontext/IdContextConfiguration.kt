package com.persons.idcontext

import jakarta.servlet.http.HttpServletRequest
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.context.annotation.RequestScope
import org.springframework.web.method.support.HandlerMethodArgumentResolver
import org.springframework.web.servlet.config.annotation.InterceptorRegistry
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer

@Configuration
class IdContextConfiguration {
    @Bean
    @RequestScope
    fun userContext(request: HttpServletRequest, verifier: SessionVerifier): UserContext =
        UserContext(request, verifier)

    @Bean
    fun userContextMvc(context: UserContext): WebMvcConfigurer = object : WebMvcConfigurer {
        override fun addArgumentResolvers(resolvers: MutableList<HandlerMethodArgumentResolver>) {
            resolvers.add(CurrentUserResolver(context))
        }

        override fun addInterceptors(registry: InterceptorRegistry) {
            registry.addInterceptor(RequireUserInterceptor(context))
        }
    }
}
