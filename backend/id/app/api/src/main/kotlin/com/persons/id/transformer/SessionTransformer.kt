package com.persons.id.transformer

import com.persons.id.dao.entity.SessionEntity
import com.persons.id.domain.SessionInfo
import com.persons.requestobservability.ClientMetadata
import java.util.UUID

fun SessionEntity.toSessionInfo(currentSessionId: UUID? = null): SessionInfo = SessionInfo(
    id,
    createdAt,
    lastSeenAt,
    expiresAt,
    ClientMetadata(
        ip = ip,
        userAgent = userAgent,
        os = os,
        osVersion = osVersion,
        browser = browser,
        device = device,
        origin = origin,
        locale = "",
        region = region,
    ),
    id == currentSessionId,
)
