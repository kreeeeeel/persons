# Dynamic properties library

- The library owns declarations, validation, Redis persistence, startup reconciliation, its OpenAPI contract, controllers and push updates. Applications only declare private DynProperty fields with DynPropertyFactory.
- Startup discovers declarations per application scope, subscribes, reconciles Redis and bootstraps memory before readiness. Ordinary value reads never query Redis.
- Persist definitions and overrides in dedicated durable Redis. Publish revisioned records after atomic writes; on reconnect restore a snapshot.
- Reconcile only the starting application's ownership. Deleting a declaration must never remove a property still owned by another application.
- Reset to the new default when its type/default/schema changes; preserve overrides for description-only changes.
- Browser registration is forbidden. Frontend definitions register only through the authenticated server integration; browsers consume public values and SSE.
- Production never falls back to memory storage. Explicit memory transport is only for tests and local preview.
