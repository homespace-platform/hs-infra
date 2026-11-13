---
name: infrastructure-review
description: Review HomeSpace infrastructure configuration, Docker Compose, service dependencies, persistence and deployment risks. Use when explicit infrastructure review is requested.
---

# infrastructure-review (Claude Code adapter for hs-infra)

This is an adapter. It does not contain the workflow itself. The source workflow is the Codex skill at:

```text
../../../.agents/skills/infrastructure-review/SKILL.md
```

(relative to this directory; it resolves to `.agents/skills/infrastructure-review/SKILL.md` in the `hs-infra` repository root).

Claude Code does not import that file automatically. When this skill is triggered:

1. Read the source file above with the Read tool.
2. Follow its workflow exactly, together with the `AGENTS.md` rules of this repository.
3. The source skill has no `references/` or `scripts/` directories. If they are added later, read them from the source skill directory when the workflow requires them.
