package com.persons.dotabuff.domain

data class OpenDotaCatalog(
    val heroes: Map<Int, OpenDotaAsset>,
    val items: Map<Int, OpenDotaAsset>,
)
