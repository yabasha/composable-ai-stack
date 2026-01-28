# CLAUDE.md

This file provides guidance for using Claude (and Claude Code) with this repository.

## How Claude should help
- Assist with feature implementation using existing patterns
- Refactor safely without breaking Convex schemas or version pins
- Generate prompts, eval datasets, and tool schemas
- Help reason about AI workflows, not just write code

## Project-specific guidance
- Convex is the primary backend; avoid duplicating logic elsewhere
- Use `packages/prompts` for prompt templates
- Add new AI tools as typed functions
- Prefer composition over large abstractions

## Best practices
- Make changes incrementally
- Explain reasoning before large refactors
- Call out trade-offs explicitly
- Never silently change dependency versions

## References
- https://agents.md/
- https://claude.com/blog/using-claude-md-files
- https://www.anthropic.com/engineering/claude-code-best-practices
