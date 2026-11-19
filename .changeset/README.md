# Changesets

Every pull request that changes what a published package does adds a changeset: run `pnpm changeset`, pick the packages, the bump type (see [Versioning](../AGENTS.md#4-versioning-and-changes)) and write a one-line summary for consumers. Commit the generated Markdown file with the change.

Changes that consumers don't see (tests, tooling, docs outside the package READMEs) don't need one.

Releasing is described in [CONTRIBUTING.md](../CONTRIBUTING.md#releases).
