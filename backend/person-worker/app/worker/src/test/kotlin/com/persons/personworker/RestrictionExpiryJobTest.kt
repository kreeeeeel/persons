package com.persons.personworker

import com.persons.personworker.exception.RestrictionExpiryFailedException
import com.persons.personworker.job.RestrictionExpiryJob
import com.persons.restrictions.client.RestrictionsClient
import com.persons.restrictions.client.generated.api.RestrictionsApi
import com.persons.restrictions.client.generated.model.RestrictionExpiryResult
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test
import org.mockito.Mockito
import reactor.core.publisher.Mono

class RestrictionExpiryJobTest {
    private val api = Mockito.mock(RestrictionsApi::class.java)
    private val job = RestrictionExpiryJob(RestrictionsClient(api))

    @Test
    fun `expiry is delegated to the owning service`() {
        Mockito.`when`(api.expireRestrictions()).thenReturn(Mono.just(RestrictionExpiryResult(2)))
        job.run()
        Mockito.verify(api).expireRestrictions()
    }

    @Test
    fun `upstream failure is not hidden`() {
        val failure = IllegalStateException("Unavailable")
        Mockito.`when`(api.expireRestrictions()).thenReturn(Mono.error(failure))
        assertThatThrownBy { job.run() }.isSameAs(failure)
    }

    @Test
    fun `empty upstream response is rejected`() {
        Mockito.`when`(api.expireRestrictions()).thenReturn(Mono.empty())
        assertThatThrownBy { job.run() }.isInstanceOf(RestrictionExpiryFailedException::class.java)
    }
}
