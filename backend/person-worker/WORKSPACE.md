# Component workspace

This repository is the `backend/person-worker` component of [Те ещё люди](https://gitlab.com/te-eshche-lyudi).

Clone the complete workspace to build with sibling dependencies:

```sh
git clone --recurse-submodules https://gitlab.com/te-eshche-lyudi/infrastructure.git persons
cd persons/backend/person-worker
git switch main
```

Use infrastructure's README for build/test commands and Docker startup. Existing Gradle composite builds and local npm dependencies intentionally use the workspace directory layout. Generated clients and runtime secrets are not committed.

Changes are committed and pushed in this repository. Its pipeline runs shared integration checks from infrastructure against the exact source commit; only main changes publish release images. Update the corresponding infrastructure gitlink when pinning a new local workspace version.
