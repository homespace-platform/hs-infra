---
name: infrastructure-review
description: Review HomeSpace infrastructure configuration, Docker Compose, service dependencies, persistence and deployment risks. Use when explicit infrastructure review is requested.
---

# Infrastructure Review

## Mode

Review-only.

## Checklist

- Configuration correctness
- Service dependencies
- Network exposure
- Environment variable usage
- Credential safety
- Persistent volumes
- Database data safety
- Resource configuration
- Deployment compatibility

## Execution

- Prefer static configuration inspection.
- Use non-destructive validation when meaningful.
- Do not launch or stop infrastructure automatically.
- Do not delete resources.
- Do not deploy.
- Do not expose secret values.

## Output

Report actionable findings, severity, affected configuration and operational risk.
