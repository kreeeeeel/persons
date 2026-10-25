package com.persons.idcontext

import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.web.method.HandlerMethod
import org.springframework.web.servlet.HandlerInterceptor

class RequireUserInterceptor(private val context: UserContext) : HandlerInterceptor {
    override fun preHandle(request: HttpServletRequest, response: HttpServletResponse, handler: Any): Boolean {
        if (handler !is HandlerMethod) {
            return true
        }

        val requiresUser = handler.hasMethodAnnotation(RequireUser::class.java) ||
            handler.beanType.isAnnotationPresent(RequireUser::class.java)

        if (requiresUser) {
            context.current()
        }

        return true
    }
}
