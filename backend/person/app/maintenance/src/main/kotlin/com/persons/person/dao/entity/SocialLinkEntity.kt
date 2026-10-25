package com.persons.person.dao.entity

import com.persons.person.domain.SocialNetwork
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.util.UUID

@Entity
@Table(name = "person_social_links")
class SocialLinkEntity(
    @Id var id: UUID = UUID.randomUUID(),
    var personId: UUID = UUID.randomUUID(),
    @Enumerated(EnumType.STRING) var network: SocialNetwork = SocialNetwork.TELEGRAM,
    @Column(name = "url") var value: String = "",
)
