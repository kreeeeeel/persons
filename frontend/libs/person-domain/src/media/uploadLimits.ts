const MEBIBYTE = 1024 * 1024;

export const mediaUploadLimits = {
    AVATAR: 2 * MEBIBYTE,
    PHOTO: 32 * MEBIBYTE,
    MOMENT: 512 * MEBIBYTE,
} as const;

export const maxMediaUploadRequestBytes = 545 * MEBIBYTE;
