# Arbor API

Backend GraphQL API for Arbor, Omni's git hosting and collaboration service.

[Docs](https://docs.omni.dev/armory/arbor) | [Feedback](https://backfeed.omni.dev/workspaces/omni/projects/arbor) | [Discord](https://discord.gg/omnidotdev)

## Prerequisites

- [Bun](https://bun.sh)
- A reachable PostgreSQL instance (see `DATABASE_URL` in `.env.local`)

## Setup

```sh
# install dependencies
bun install

# create your local env file and fill in the values
cp .env.local.template .env.local

# generate local TLS certificates (dev server runs over HTTPS)
bun tls:generate

# apply database migrations
bun db:migrate
```

## Run

```sh
# development (hot reload, GraphiQL enabled, HTTPS on PORT, default 4000)
bun dev

# production (runs migrations, then the built server)
bun start
```

The GraphQL endpoint and GraphiQL playground are served at `/graphql`. In development the server listens over HTTPS (e.g. `https://localhost:4000`).

## MCP server

Arbor exposes its own forge operations to agents over [MCP](https://modelcontextprotocol.io) at `/mcp`, so an agent drives repositories, pull requests, stacks and verification checks through a first-party surface rather than by scraping.

Authenticate with a personal access token as a bearer token:

```sh
Authorization: Bearer <personal access token>
```

Every tool is scoped twice: by the presented credential (a token may be read-only, and may be confined to named repositories) and by what the authenticating user may see. A repository the caller may not read is reported identically to one that does not exist.

### Agent instructions

A repository may define conventions for agents in a root `AGENTS.md`. `get_agent_instructions` returns it for a given repository and ref (defaulting to the default branch), and the server's handshake instructions tell connecting agents to consult it before proposing a change.

Arbor recognizes `AGENTS.md` only, not vendor-specific filenames, and reads it from the repository root. A repository that defines none gets `present: false`, which is a normal answer rather than an error.

## Dev commands

| Command | Description |
| --- | --- |
| `bun build` | Build the server to `build/` |
| `bun test` | Run the test suite |
| `bun typecheck` | Type check with `tsc --noEmit` |
| `bun check` | Lint and format check (Biome) |
| `bun db:generate` | Generate migrations from schema changes |
| `bun db:migrate` | Apply pending migrations, then regenerate the GraphQL schema |
| `bun graphql:generate` | Regenerate `schema.graphql` from the database |

## Diagnostics

- Health check: `GET /health` returns `{ "status": "ok", "commit": "<sha>" }`
- Logs: the server logs to stdout/stderr; in development they stream to the `bun dev` terminal
- Common issues:
  - Server fails to start over HTTPS: run `bun tls:generate` to create `cert.pem` and `key.pem`
  - Database connection errors: verify `DATABASE_URL` and that Postgres is reachable, then run `bun db:migrate`
  - Stale GraphQL schema after a schema change: run `bun graphql:generate`

## License

The code in this repository is licensed under Apache 2.0, &copy; [Omni LLC](https://omni.dev). See [LICENSE.md](LICENSE.md) for more information.
