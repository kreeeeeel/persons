package com.persons.gateway.controller

import com.persons.gateway.component.StreamingProxy
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyEmitter

@RestController
class ProxyController(private val proxy: StreamingProxy) {
    @RequestMapping("/id/**", "/person/**")
    fun forward(request: HttpServletRequest, response: HttpServletResponse): ResponseBodyEmitter? =
        proxy.forward(request, response)
}
