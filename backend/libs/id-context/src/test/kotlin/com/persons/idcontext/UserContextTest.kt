package com.persons.idcontext

import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.mock.web.MockHttpServletResponse
import org.springframework.web.method.HandlerMethod
import java.time.Instant
import java.util.UUID
import java.util.concurrent.atomic.AtomicInteger

private const val PRINCIPAL_60 = 60L
private const val IS_EQUAL_TO_1 = 1

class UserContextTest {
    @Test
    fun `resolves a session once per request and injects the same principal`() {
        val calls = AtomicInteger()
        val principal = UserPrincipal(
            UUID.randomUUID(),
            UUID.randomUUID(),
            "anna@example.com",
            "ru",
            Instant.now().plusSeconds(PRINCIPAL_60),
        )
        val request = MockHttpServletRequest()

        request.addHeader("Authorization", "Bearer opaque-token")

        val context = UserContext(request) { token ->
            assertThat(token).isEqualTo("opaque-token")
            calls.incrementAndGet()
            principal
        }
        val handler = HandlerMethod(
            ContextTestController(),
            ContextTestController::class.java.getMethod("protectedMethod", UserPrincipal::class.java),
        )

        RequireUserInterceptor(context).preHandle(request, MockHttpServletResponse(), handler)

        val parameter = handler.methodParameters.single()
        val resolver = CurrentUserResolver(context)

        assertThat(resolver.supportsParameter(parameter)).isTrue()
        assertThat(context.current()).isSameAs(principal)
        assertThat(calls.get()).isEqualTo(IS_EQUAL_TO_1)
    }

    @Test
    fun `rejects missing and malformed credentials`() {
        val request = MockHttpServletRequest()
        val context = UserContext(request) { throw AssertionError("Verifier must not receive missing credentials") }

        assertThatThrownBy { context.current() }.isInstanceOf(SessionRequiredException::class.java)
        request.addHeader("Authorization", "Basic credentials")
        assertThatThrownBy { context.current() }.isInstanceOf(SessionRequiredException::class.java)
    }

    @Test
    fun `leaves public methods and resource handlers accessible without a session`() {
        val request = MockHttpServletRequest()
        val context = UserContext(request) { throw AssertionError("Public handler must not resolve a session") }
        val interceptor = RequireUserInterceptor(context)
        val response = MockHttpServletResponse()
        val handler =
            HandlerMethod(ContextTestController(), ContextTestController::class.java.getMethod("publicMethod"))

        assertThat(interceptor.preHandle(request, response, handler)).isTrue()
        assertThat(interceptor.preHandle(request, response, Any())).isTrue()
    }

    @Test
    fun `requires a session when the controller class is annotated`() {
        val request = MockHttpServletRequest()
        val context = UserContext(request) { throw AssertionError("Missing credentials must not reach the verifier") }
        val handler = HandlerMethod(
            ProtectedContextTestController(),
            ProtectedContextTestController::class.java.getMethod("protectedMethod"),
        )

        assertThatThrownBy { RequireUserInterceptor(context).preHandle(request, MockHttpServletResponse(), handler) }
            .isInstanceOf(SessionRequiredException::class.java)
    }
}
