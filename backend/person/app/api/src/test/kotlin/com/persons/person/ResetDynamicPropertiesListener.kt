package com.persons.person

import com.persons.dynamicproperties.component.DynPropertyService
import org.springframework.test.context.TestContext
import org.springframework.test.context.support.AbstractTestExecutionListener

// Redis-backed configuration has its own lifecycle; JDBC test rollbacks do not reset it.
class ResetDynamicPropertiesListener : AbstractTestExecutionListener() {
    override fun afterTestMethod(testContext: TestContext) {
        testContext.applicationContext.getBeanProvider(DynPropertyService::class.java).ifAvailable { service ->
            service.current().stream()
                .filter {
                    it.defaultValue != null &&
                        it.value != it.defaultValue
                }.forEach {
                    service.update(it.key, requireNotNull(it.defaultValue), null, "test-cleanup")
                }
        }
    }
}
