# Project conventions

- Follow the user's Kotlin and production-code instructions. One class per file; no explicit Kotlin loops.
- Kotlin packages use `com.persons`. Contract first: `app/contract/api/schema`; regenerate clients rather than editing generated code.
- DAO services use `@Service`; orchestration and integration logic use `@Component`. Use Flyway DDL, JPA validation, explicit exception types and justified transactions.
- Production persistence uses Spring Data JPA repositories and Criteria API/specifications. Do not use JdbcTemplate, NamedParameterJdbcTemplate, JDBC clients or native SQL queries in repositories.
- Frontends use TypeScript, Next App Router, Gravity UI, CSS Modules, shared Golos Text, and at least 16px text. Reuse `frontend/libs` and generated clients. Respect both themes, ru/en, reduced motion, and loading/error states.
- New branded illustrations must use the consented friend references from the current task. Do not commit the original reference photographs.
- Generated files, dependencies, secrets, build outputs and test screenshots are ignored. Keep checks enabled.
- Build/test commands and local container setup are documented in README.md.
