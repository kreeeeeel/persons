package com.persons.i18n

import com.persons.requestobservability.SignedJwt
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc
import org.springframework.boot.test.context.SpringBootTest
import org.springframework.http.MediaType
import org.springframework.test.context.ActiveProfiles
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.put

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("tests")
class CatalogIntegrationTest {
    @Autowired private lateinit var mvc: MockMvc

    @Test
    fun `Swagger serves the contract without exposing generated definitions`() {
        mvc.get("/swagger-ui/index.html").andExpect { status { isOk() } }
        mvc.get("/v3/api-docs/swagger-config").andExpect {
            status { isOk() }
            jsonPath("$.url") { value("/openapi/api.yaml") }
        }
        mvc.get("/openapi/api.yaml").andExpect { status { isOk() } }
        mvc.get("/v3/api-docs").andExpect { status { isNotFound() } }
    }

    @Test
    fun `schema starts empty and translation updates change only the requested language`() {
        val empty = mvc.get("/v1/catalogs/ru/id").andExpect {
            status { isOk() }
            content { json("""{"locale":"ru","namespace":"id","messages":{}}""") }
        }.andReturn().response.getHeader("ETag")

        mvc.put("/internal/v1/catalogs/ru/id") {
            contentType = MediaType.APPLICATION_JSON
            content = """{"messages":{"signIn":"Enter"}}"""
        }.andExpect { status { isUnauthorized() } }
        mvc.put("/internal/v1/catalogs/ru/id") {
            header(
                "X-Service-Authorization",
                "Bearer " +
                    SignedJwt("tests-internal-jwt-secret-at-least-thirty-two-characters").service("catalog-test"),
            )
            contentType = MediaType.APPLICATION_JSON
            content = """{"messages":{"signIn":"Enter"}}"""
        }.andExpect { status { isOk() } }

        val populated = mvc.get("/v1/catalogs/ru/id").andExpect {
            status { isOk() }
            jsonPath("$.messages.signIn") { value("Enter") }
        }.andReturn().response.getHeader("ETag")

        assertThat(populated).isNotEqualTo(empty)
        mvc.get("/v1/catalogs/en/id").andExpect { jsonPath("$.messages") { isEmpty() } }
        mvc.get("/v1/catalogs/ru/id") {
            header("If-None-Match", populated.orEmpty())
        }.andExpect { status { isNotModified() } }
    }
}
