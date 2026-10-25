package com.persons.personworker

import org.hibernate.dialect.H2Dialect

// H2 2.3 supports this lock clause, while Hibernate 6.6's H2 dialect does not advertise it.
// Production PostgreSQL tests use Hibernate's standard PostgreSQL dialect.
class WorkerH2Dialect : H2Dialect() {
    override fun supportsSkipLocked(): Boolean = true
    override fun getForUpdateSkipLockedString(): String = " for update skip locked"
    override fun getForUpdateSkipLockedString(aliases: String): String = getForUpdateSkipLockedString()
}
