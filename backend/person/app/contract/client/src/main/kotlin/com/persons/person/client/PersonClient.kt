package com.persons.person.client

import com.persons.person.client.generated.api.AccountsApi
import com.persons.person.client.generated.api.AchievementsApi
import com.persons.person.client.generated.api.AdminApi
import com.persons.person.client.generated.api.ClaimsApi
import com.persons.person.client.generated.api.EngagementApi
import com.persons.person.client.generated.api.GalleryApi
import com.persons.person.client.generated.api.InteractionsApi
import com.persons.person.client.generated.api.MediaApi
import com.persons.person.client.generated.api.NotificationsApi
import com.persons.person.client.generated.api.PersonsApi
import com.persons.person.client.generated.api.RestrictionsApi

class PersonClient(
    val persons: PersonsApi,
    val admin: AdminApi,
    val interactions: InteractionsApi,
    val media: MediaApi,
    val notifications: NotificationsApi,
    val gallery: GalleryApi,
    val claims: ClaimsApi,
    val achievements: AchievementsApi,
    val accounts: AccountsApi,
    val engagement: EngagementApi,
    val restrictions: RestrictionsApi,
)
