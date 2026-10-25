# Frontend dynamic properties

- The configured URL points to the dynamic-properties library contract. Never poll person APIs or read Redis from a browser.
- Declare typed handles with DynPropertyFactory. External handles reference backend-owned properties; frontend-owned definitions register only through the server integration.
- Bootstrap once, keep values in application memory and apply revisioned SSE updates. Reconnect loads a fresh snapshot; no interval polling.
- Never expose service tokens or private properties in browser bundles. The server proxy owns registration and authorization.
- Keep SSR initial values and hydration consistent. React consumers use useDynProperty to subscribe.
