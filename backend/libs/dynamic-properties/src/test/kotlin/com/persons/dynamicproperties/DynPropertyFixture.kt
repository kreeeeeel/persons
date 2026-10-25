package com.persons.dynamicproperties

class DynPropertyFixture {
    private val enabled = DynPropertyFactory.createBoolean("test.enabled", true).description("Test flag").build()
    private val percentage: DynProperty<Rollout> =
        DynPropertyFactory
            .createRolloutPercentageFeatureToggle("test.rollout")
            .description("Rollout percentage")
            .build()

    fun enabled(): Boolean = enabled.value

    fun rollout(): Rollout = percentage.value
}
