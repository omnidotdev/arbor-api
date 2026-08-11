# syntax=docker/dockerfile:1

FROM oven/bun:1 AS base
WORKDIR /app

# Install production dependencies
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production --ignore-scripts

# Build
FROM base AS builder
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
ARG GIT_SHA
RUN echo "$GIT_SHA" > /app/.git-sha
RUN bun run build
# Guard: bun's bundler can emit an undefined __promiseAll helper for concurrent
# async-module init, crash-looping the server on boot (the 2026-06 aether
# incident). Fail the build before a broken bundle can deploy.
RUN if grep -q '__promiseAll' build/server.js && \
      ! grep -qE '(function|var|let|const) +__promiseAll' build/server.js; then \
      echo 'FATAL: bundle references undefined __promiseAll (bun bundler bug); aborting build'; exit 1; \
    fi
RUN bun run src/scripts/cacheSchemaHash.ts

# Run
FROM base AS runner
ENV NODE_ENV=production

# The Git Smart HTTP serving path (advertiseRefs/uploadPack/receivePack in
# lib/git/smart-http.service.ts) shells out to the git-upload-pack and
# git-receive-pack binaries, which ship with the git CLI. Install it in the
# runtime image so clone/fetch/push work.
RUN apt-get update \
  && apt-get install -y --no-install-recommends git \
  && rm -rf /var/lib/apt/lists/*

# Create the repo storage dir owned by the non-root runtime user BEFORE any
# named-volume / k8s volume mounts, so a fresh mount inherits writable
# ownership (GIT_REPOS_PATH defaults to /var/lib/arbor/repos).
RUN mkdir -p /var/lib/arbor && chown -R bun:bun /var/lib/arbor

USER bun
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
# The gRPC client loads the vendored proto at runtime relative to the bundle
# (import.meta.dir -> /app/build), but the bundler emits only JS. Ship the proto
# next to server.js so arbor-git delegation can initialize.
COPY --from=builder /app/src/lib/git/proto ./build/proto
COPY --from=builder /app/package.json ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/.cache ./.cache
COPY --from=builder /app/.git-sha ./.git-sha

EXPOSE 4000
CMD ["bun", "run", "start"]
