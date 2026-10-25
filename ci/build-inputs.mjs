// Keep this graph aligned with Gradle composite builds and package.json file dependencies.
export const backendProjects = ['id', 'mail', 'i18n', 'person', 'person-worker', 'restrictions', 'gateway'];
export const frontendApps = ['id', 'person', 'person-admin'];
export const libraries = ['libs/id-context', 'libs/request-observability', 'libs/dynamic-properties', 'libs/dotabuff-integration', 'libs/lettify-integration'];

const buildFiles = ['build.gradle.kts', 'settings.gradle.kts', 'gradle.properties', 'gradle', 'gradlew'];
const contract = (project) => [
    ...buildFiles.map((path) => `backend/${project}/${path}`),
    `backend/${project}/app/contract`,
];
const observability = ['backend/libs/request-observability'];
const dynamicContract = [
    ...buildFiles.map((path) => `backend/libs/dynamic-properties/${path}`),
    'backend/libs/dynamic-properties/contract',
];
const integrations = ['backend/libs/dynamic-properties', 'backend/libs/dotabuff-integration', 'backend/libs/lettify-integration'];
const sharedFrontend = [
    'frontend/assets', 'frontend/libs/i18n', 'frontend/libs/photo-editor',
    'frontend/libs/theme', 'frontend/libs/ui',
];

export const clientInputs = Object.fromEntries(['id', 'i18n', 'person'].map((name) => [name, contract(name)]));
clientInputs['dynamic-properties'] = dynamicContract;
clientInputs.person.push(...dynamicContract);
export const backendInputs = {
    id: ['backend/id', ...contract('mail'), ...contract('i18n'), 'backend/libs/id-context', ...observability],
    mail: ['backend/mail', ...observability],
    i18n: ['backend/i18n', ...observability],
    person: ['backend/person', ...contract('id'), 'backend/libs/id-context', ...observability, ...integrations],
    restrictions: ['backend/restrictions', ...contract('id'), 'backend/libs/id-context', ...observability],
    gateway: [
        'backend/gateway', ...contract('id'), ...contract('person'), ...contract('restrictions'),
        'backend/libs/id-context', ...observability, ...dynamicContract,
    ],
    'person-worker': [
        'backend/person-worker',
        ...buildFiles.map((path) => `backend/person/${path}`),
        'backend/person/app/maintenance',
        ...contract('restrictions'), ...contract('id'), 'backend/libs/id-context', ...observability, ...integrations,
    ],
};

export const services = [
    ...backendProjects.map((name) => ({
        name, kind: 'backend', project: name,
        dockerfile: `backend/${name}/app/${name === 'person-worker' ? 'worker' : 'api'}/docker/Dockerfile.prebuilt`,
        inputs: backendInputs[name],
    })),
    ...frontendApps.map((app) => ({
        name: `${app}-web`, kind: 'frontend', project: app,
        dockerfile: `frontend/${app}/docker/Dockerfile.prebuilt`,
        clients: app === 'id' ? ['id', 'i18n'] : ['id', 'i18n', 'person', 'dynamic-properties'],
        inputs: [
            `frontend/${app}`, ...sharedFrontend,
            ...(app === 'id' ? [] : ['frontend/libs/person-domain', 'frontend/libs/dynamic-properties']),
            ...clientInputs.id, ...clientInputs.i18n,
            ...(app === 'id' ? [] : clientInputs.person),
        ],
    })),
    {
        name: 'assets', kind: 'storage', dockerfile: 'docker/minio/Dockerfile',
        inputs: ['frontend/assets', 'frontend/libs/i18n/assets/flags', 'docker/minio/initialize.sh', 'docker/minio/public-assets.json', '.dockerignore'],
    },
    {name: 'minio', kind: 'storage', dockerfile: 'docker/minio/Dockerfile.server', inputs: ['.dockerignore']},
];

export const imageVariable = (service) => `${service.replaceAll('-', '_').toUpperCase()}_IMAGE_TAG`;
