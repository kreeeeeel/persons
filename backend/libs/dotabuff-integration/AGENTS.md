# Game integration conventions

- Public source contracts and immutable provider domain live in this library; database access belongs to person maintenance and scheduling to person-worker.
- Never turn HTTP denial, rate limiting, a private profile or an unknown HTML structure into an empty successful history.
- Use fixed trusted origins, bounded responses, timeouts and ordinary HTTP only. Do not add anti-bot bypasses.
- Keep parsers covered by HTML fixtures and clients by local HTTP tests. Live provider access is a separate validation step.
- Future providers implement the worker GameIntegration port; never add their networking to an API request.
