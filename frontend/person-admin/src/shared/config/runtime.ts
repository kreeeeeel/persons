import { env } from 'node:process';

export function getServerConfig() {
    const profile = env.APP_ENV;

    if (!profile || !['dev', 'testing', 'prod'].includes(profile)) {
        throw new Error('APP_ENV must be dev, testing or prod');
    }

    const local = profile === 'dev';
    const idUrl = env.ID_BASE_URL ?? (local ? 'http://localhost:8087/id' : undefined);
    const personUrl = env.PERSON_BASE_URL ?? (local ? 'http://localhost:8087/person' : undefined);
    const dynamicPropertiesUrl = env.DYNAMIC_PROPERTIES_BASE_URL ?? personUrl;
    const i18nUrl = env.I18N_BASE_URL ?? (local ? 'http://localhost:8082' : undefined);
    const assetBaseUrl = env.ASSET_BASE_URL ?? (local ? 'http://localhost:9000/persons/assets' : undefined);
    const publicUrl = env.PUBLIC_URL ?? (local ? 'http://localhost:3001' : undefined);
    const idPublicUrl = env.ID_PUBLIC_URL ?? (local ? 'http://localhost:3000' : undefined);
    const personPublicUrl = env.PERSON_PUBLIC_URL ?? (local ? 'http://localhost:3002' : undefined);
    const internalJwtSecret =
        env.PROJECT_INTERNAL_JWT_SECRET ??
        (local ? 'local-development-internal-jwt-secret-change-before-deploy' : undefined);

    if (
        !idUrl ||
        !personUrl ||
        !dynamicPropertiesUrl ||
        !i18nUrl ||
        !assetBaseUrl ||
        !publicUrl ||
        !idPublicUrl ||
        !personPublicUrl ||
        !internalJwtSecret ||
        internalJwtSecret.length < 32
    ) {
        throw new Error('Service URLs and PROJECT_INTERNAL_JWT_SECRET are required');
    }

    [idUrl, personUrl, dynamicPropertiesUrl, i18nUrl, assetBaseUrl, publicUrl, idPublicUrl, personPublicUrl].forEach(
        (value) => {
            const url = new URL(value);

            if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
                throw new Error('Service URLs must use HTTP(S) without credentials, query or fragment');
            }
        },
    );

    const publicUrls = [publicUrl, idPublicUrl, personPublicUrl].map((value) => new URL(value));
    const sessionCookieDomain = env.SESSION_COOKIE_DOMAIN?.trim().toLowerCase().replace(/^\./, '') || undefined;

    if (sessionCookieDomain) {
        const validDomain = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(
            sessionCookieDomain,
        );
        if (
            !validDomain ||
            sessionCookieDomain.length > 253 ||
            publicUrls.some(
                (url) =>
                    url.protocol !== 'https:' ||
                    (url.hostname !== sessionCookieDomain && !url.hostname.endsWith(`.${sessionCookieDomain}`)),
            )
        ) {
            throw new Error('SESSION_COOKIE_DOMAIN must cover all HTTPS public URLs');
        }
    } else if (new Set(publicUrls.map((url) => url.hostname)).size > 1) {
        throw new Error('SESSION_COOKIE_DOMAIN is required for public URLs on different hosts');
    }

    return {
        profile,
        dynamicPropertiesUrl,
        idUrl,
        personUrl,
        i18nUrl,
        assetBaseUrl,
        publicUrl,
        idPublicUrl,
        personPublicUrl,
        internalJwtSecret,
        sessionCookieDomain,
        secureCookies: new URL(publicUrl).protocol === 'https:',
        trustProxy: env.TRUST_PROXY === 'true',
    };
}
