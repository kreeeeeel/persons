package com.persons.restrictions.dao.entity

import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "account_policy_lock")
class PolicyLockEntity(@Id var id: Short = 1)
