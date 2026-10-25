import { isVideoFile, videoUploadAccept } from '@persons/person-domain/media/videoFiles';
import { mediaUploadLimits } from '@persons/person-domain/media/uploadLimits';

export const feedFileAccept = `image/jpeg,image/png,${videoUploadAccept}`;

export function feedFileKind(file: File): 'photo' | 'moment' {
    return isVideoFile(file) ? 'moment' : 'photo';
}

export function validateFeedFiles(files: readonly File[]): 'fileCount' | 'fileType' | 'fileSize' | undefined {
    if (files.length > 1) {
        return 'fileCount';
    }
    if (files.some((file) => !isVideoFile(file) && !['image/jpeg', 'image/png'].includes(file.type))) {
        return 'fileType';
    }
    if (files.some((file) => !file.size || file.size > mediaUploadLimits[isVideoFile(file) ? 'MOMENT' : 'PHOTO'])) {
        return 'fileSize';
    }
    return undefined;
}
