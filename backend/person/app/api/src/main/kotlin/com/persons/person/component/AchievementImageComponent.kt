package com.persons.person.component

import com.persons.person.domain.MediaKind
import com.persons.person.domain.StoredImage
import com.persons.person.service.StorageGarbageService
import org.springframework.stereotype.Component
import org.springframework.web.multipart.MultipartFile
import java.util.UUID

@Component
class AchievementImageComponent(
    private val policy: MediaPolicy,
    private val store: PersonMediaStore,
    private val objectKeys: MediaObjectKeys,
    private val garbage: StorageGarbageService,
) {
    fun upload(file: MultipartFile): StoredImage {
        val image = policy.validate(file, MediaKind.PHOTO)
        val key = objectKeys.achievement(UUID.randomUUID())
        garbage.stage(key)
        store.put(key, image.contentType, image.size, file::getInputStream)
        return StoredImage(key, image.contentType, image.size)
    }
}
