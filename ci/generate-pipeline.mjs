import {imageVariable, libraries} from './build-inputs.mjs';

export function generatePipeline(plan, sourceLock = '') {
    const pipeline = {
        include: [{local: 'ci/jobs.yml'}],
        variables: {
            RELEASE_SHA: plan.release, CI_TOOLING_IMAGE: plan.toolingImage,
            WORKSPACE_LOCK: sourceLock,
            IMAGE_MANIFEST: plan.images.map(({name, tag}) => `${imageVariable(name)}=${tag}\n`).join(''),
        },
    };
    const build = plan.images.filter((service) => service.build);
    const toolingNeeds = plan.buildTooling ? [{job: 'tooling', artifacts: false}] : [];
    if (plan.buildTooling) pipeline.tooling = {extends: '.tooling'};
    if (plan.clients.length) {
        pipeline.clients = {
            extends: '.clients', needs: [...toolingNeeds],
            variables: {CLIENTS: plan.clients.join(' '), CLIENTS_KEY: plan.clientKey},
        };
    }
    const backend = build.filter(({kind}) => kind === 'backend');
    // Composite builds compile dependencies, but do not run their own tests/ktlint tasks.
    const selectedLibraries = libraries.filter((name) => backend.some(({inputs}) => inputs.includes(`backend/${name}`)));
    for (const project of selectedLibraries) {
        pipeline[`check:${project}`] = {extends: project === 'libs/dynamic-properties' ? '.dynamic-properties-backend' : '.backend', needs: [...toolingNeeds], variables: {PROJECT: project}};
    }
    const published = [];
    for (const service of build) {
        const verifyJob = `check:${service.name}`;
        if (service.kind !== 'storage') {
            pipeline[verifyJob] = {
                extends: service.name === 'person-worker' ? '.worker-backend' :
                    service.name === 'restrictions' ? '.restrictions-backend' : `.${service.kind}`,
                needs: [...toolingNeeds, ...(service.kind === 'frontend' ? [{job: 'clients'}] : [])],
                variables: {[service.kind === 'frontend' ? 'APP' : 'PROJECT']: service.project},
            };
        }
        if (!plan.publish) continue;
        const publishJob = `publish:${service.name}`;
        published.push({job: publishJob, artifacts: false});
        pipeline[publishJob] = {
            extends: service.kind === 'storage' ? '.publish-storage' : '.publish',
            needs: [...(service.kind === 'storage' ? [] : [{job: verifyJob}]),
                ...selectedLibraries.map((name) => ({job: `check:${name}`, artifacts: false}))],
            variables: {SERVICE: service.name, IMAGE_TAG: service.tag, DOCKERFILE: service.dockerfile},
        };
    }
    if (plan.publish && build.some(({kind}) => kind === 'storage')) {
        const tag = (name) => plan.images.find((service) => service.name === name).tag;
        const changed = (name) => build.some((service) => service.name === name) ? 'true' : 'false';
        pipeline.storage = {
            extends: '.storage', needs: [...published.filter(({job}) => job === 'publish:minio' || job === 'publish:assets')],
            variables: {MINIO_IMAGE_TAG: tag('minio'), ASSETS_IMAGE_TAG: tag('assets'), MINIO_BUILT: changed('minio'), ASSETS_BUILT: changed('assets')},
        };
    }
    // A real job keeps cache-hit and infrastructure-only pipelines valid.
    pipeline.summary = {extends: '.summary', needs: []};
    if (plan.publish) {
        pipeline.deploy = {
            extends: '.deploy', needs: [...published,
                ...(pipeline.storage ? [{job: 'storage', artifacts: false}] : []),
                ...selectedLibraries.map((name) => ({job: `check:${name}`, artifacts: false}))],
        };
    }
    return pipeline;
}
