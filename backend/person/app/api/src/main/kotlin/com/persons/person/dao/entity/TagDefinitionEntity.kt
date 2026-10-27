package com.persons.person.dao.entity

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "person_tag_definitions")
class TagDefinitionEntity(@Id var tag: String = "", @Column(columnDefinition = "text") var descriptions: String = "{}")
