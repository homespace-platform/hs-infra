# HomeSpace Infrastructure — Codex Instructions

## Scope

Infrastructure, Docker Compose, supporting scripts and operational configuration.

## Safety

- Do not execute destructive infrastructure commands.
- Do not remove Docker volumes without approval.
- Do not reset databases.
- Do not delete persistent data.
- Do not modify production environments without authorization.
- Do not expose environment secrets.
- Do not automatically deploy.

## Development

- Preserve existing service configuration.
- Avoid unrelated infrastructure changes.
- Preserve volume mappings and persistent storage.
- Validate environment variable references.
- Avoid new infrastructure dependencies without necessity.

## Verification

Prefer non-destructive configuration validation.

For Docker Compose changes, use the correct project configuration file and validate it without starting services when possible.

Do not automatically execute:
- docker compose up
- docker compose down
- docker compose down -v
- docker system prune
- Database reset or destructive SQL

Broader operational testing requires a concrete reason and appropriate authorization.

## Skills

Use infrastructure-review for explicit infrastructure review.

## Completion

Report changes, non-destructive checks and operational risks.
