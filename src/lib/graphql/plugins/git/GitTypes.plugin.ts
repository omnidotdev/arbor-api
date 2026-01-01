import { lambda, object } from "postgraphile/grafast";
import { extendSchema } from "postgraphile/utils";

import { gitService, repositoryService } from "lib/git";

import type { FieldArgs } from "postgraphile/grafast";

/**
 * Git types plugin.
 *
 * Defines GitHub-style git object types:
 * - GitObject interface
 * - Ref, Commit, Tree, TreeEntry, Blob, GitActor
 * - Connection types for pagination
 *
 * Following GitHub's GraphQL API patterns.
 */
const GitTypesPlugin = extendSchema((build) => {
  return {
    typeDefs: /* GraphQL */ `
      """
      An actor in a Git commit (author or committer).
      """
      type GitActor {
        name: String
        email: String
        date: Datetime
      }

      """
      Base interface for Git objects.
      """
      interface GitObject {
        """
        The Git object ID (SHA).
        """
        oid: String!

        """
        The repository this object belongs to.
        """
        repository: Repository!
      }

      """
      A Git reference (branch or tag).
      """
      type Ref {
        """
        Unique identifier for this ref.
        """
        id: ID!

        """
        The reference name without the prefix (e.g., "main" for refs/heads/main).
        """
        name: String!

        """
        The reference prefix (e.g., "refs/heads/" or "refs/tags/").
        """
        prefix: String!

        """
        The Git object the ref points to.
        """
        target: GitObject
      }

      """
      A Git commit.
      """
      type Commit implements GitObject {
        oid: String!
        repository: Repository!

        """
        The full commit message.
        """
        message: String!

        """
        The first line of the commit message.
        """
        messageHeadline: String!

        """
        The author of the commit.
        """
        author: GitActor

        """
        The committer of the commit.
        """
        committer: GitActor

        """
        When the commit was authored.
        """
        authoredDate: Datetime

        """
        When the commit was committed.
        """
        committedDate: Datetime

        """
        The tree object for this commit.
        """
        tree: Tree

        """
        The parent commits.
        """
        parents: [Commit!]!

        """
        Commit history starting from this commit.
        """
        history(
          """
          Number of commits to return.
          """
          first: Int = 20

          """
          Number of commits to skip.
          """
          offset: Int = 0

          """
          Filter to commits affecting this path.
          """
          path: String
        ): [Commit!]!
      }

      """
      A Git tree (directory).
      """
      type Tree implements GitObject {
        oid: String!
        repository: Repository!

        """
        The entries in this tree.
        """
        entries: [TreeEntry!]!
      }

      """
      An entry in a Git tree.
      """
      type TreeEntry {
        """
        The entry name.
        """
        name: String!

        """
        The full path from the repository root.
        """
        path: String!

        """
        The entry type (blob, tree, or commit for submodules).
        """
        type: String!

        """
        The file mode.
        """
        mode: String!

        """
        The Git object ID.
        """
        oid: String!

        """
        The Git object this entry points to.
        """
        object: GitObject
      }

      """
      A Git blob (file content).
      """
      type Blob implements GitObject {
        oid: String!
        repository: Repository!

        """
        UTF-8 text content, or null if binary.
        """
        text: String

        """
        Size of the blob in bytes.
        """
        byteSize: Int!

        """
        Whether this blob is binary.
        """
        isBinary: Boolean!
      }

      """
      A connection to a list of refs.
      """
      type RefConnection {
        """
        The refs.
        """
        nodes: [Ref!]!

        """
        The total count of refs.
        """
        totalCount: Int!
      }

      """
      Extend Repository with git operations.
      """
      extend type Repository {
        """
        Fetch a ref by its fully qualified name (e.g., "refs/heads/main").
        """
        ref(qualifiedName: String!): Ref

        """
        List refs matching a prefix.
        """
        refs(
          """
          The ref prefix to filter by (e.g., "refs/heads/" for branches).
          """
          refPrefix: String!

          """
          Maximum number of refs to return.
          """
          first: Int = 100
        ): RefConnection!

        """
        The default branch ref.
        """
        defaultBranchRef: Ref

        """
        Fetch a commit by its SHA.
        """
        commit(
          """
          The commit SHA.
          """
          sha: String!
        ): Commit
      }
    `,

    objects: {
      GitActor: {
        plans: {
          name($actor: any) {
            return lambda($actor, (actor) => (actor as any)?.name ?? null);
          },
          email($actor: any) {
            return lambda($actor, (actor) => (actor as any)?.email ?? null);
          },
          date($actor: any) {
            return lambda($actor, (actor) => {
              const a = actor as any;
              return a?.timestamp
                ? new Date(a.timestamp * 1000).toISOString()
                : null;
            });
          },
        },
      },

      Ref: {
        plans: {
          id($ref: any) {
            return lambda($ref, (ref) => {
              const r = ref as RefData | null;
              return r ? `${r.prefix}${r.name}` : null;
            });
          },
          name($ref: any) {
            return lambda($ref, (ref) => (ref as any)?.name ?? null);
          },
          prefix($ref: any) {
            return lambda($ref, (ref) => (ref as any)?.prefix ?? null);
          },
          target($ref: any) {
            return lambda($ref, async (ref) => {
              const r = ref as RefData | null;
              if (!r) return null;
              const { owner, repo, sha } = r;

              const exists = await repositoryService.exists(owner, repo);
              if (!exists) return null;

              const commit = await gitService.getCommit(owner, repo, sha);
              if (!commit) return null;

              return {
                __typename: "Commit",
                owner,
                repo,
                oid: commit.sha,
                message: commit.message,
                author: commit.author,
                committer: commit.committer,
                parents: commit.parents,
              };
            });
          },
        },
      },

      Commit: {
        plans: {
          oid($commit: any) {
            return lambda($commit, (commit) => (commit as any)?.oid ?? null);
          },
          repository($commit: any) {
            return lambda($commit, (commit) => {
              const c = commit as CommitData | null;
              return c ? { owner: c.owner, repo: c.repo } : null;
            });
          },
          message($commit: any) {
            return lambda(
              $commit,
              (commit) => (commit as any)?.message ?? null,
            );
          },
          messageHeadline($commit: any) {
            return lambda(
              $commit,
              (commit) => (commit as any)?.message?.split("\n")[0] ?? "",
            );
          },
          author($commit: any) {
            return lambda($commit, (commit) => (commit as any)?.author ?? null);
          },
          committer($commit: any) {
            return lambda(
              $commit,
              (commit) => (commit as any)?.committer ?? null,
            );
          },
          authoredDate($commit: any) {
            return lambda($commit, (commit) => {
              const c = commit as any;
              return c?.author?.timestamp
                ? new Date(c.author.timestamp * 1000).toISOString()
                : null;
            });
          },
          committedDate($commit: any) {
            return lambda($commit, (commit) => {
              const c = commit as any;
              return c?.committer?.timestamp
                ? new Date(c.committer.timestamp * 1000).toISOString()
                : null;
            });
          },
          tree($commit: any) {
            return lambda($commit, async (commit) => {
              const c = commit as CommitData | null;
              if (!c) return null;
              const { owner, repo, oid } = c;

              const entries = await gitService.getTree(owner, repo, oid, "");

              return {
                __typename: "Tree",
                owner,
                repo,
                oid,
                entries: entries.map((e) => ({
                  ...e,
                  name: e.path,
                  path: e.path,
                  owner,
                  repo,
                  commitOid: oid,
                })),
              };
            });
          },
          parents($commit: any) {
            return lambda($commit, async (commit) => {
              const c = commit as CommitData | null;
              if (!c) return [];
              const { owner, repo, parents } = c;

              const parentCommits = [];
              for (const parentSha of parents || []) {
                const parent = await gitService.getCommit(
                  owner,
                  repo,
                  parentSha,
                );
                if (parent) {
                  parentCommits.push({
                    __typename: "Commit",
                    owner,
                    repo,
                    oid: parent.sha,
                    message: parent.message,
                    author: parent.author,
                    committer: parent.committer,
                    parents: parent.parents,
                  });
                }
              }
              return parentCommits;
            });
          },
          history($commit: any, fieldArgs: FieldArgs) {
            const $first = fieldArgs.getRaw("first");
            const $offset = fieldArgs.getRaw("offset");

            return lambda(
              object({ commit: $commit, first: $first, offset: $offset }),
              async (args) => {
                const { commit, first, offset } = args as any;
                const c = commit as CommitData | null;
                if (!c) return [];
                const { owner, repo, oid } = c;

                const commits = await gitService.getLog(owner, repo, oid, {
                  depth: first ?? 20,
                  skip: offset ?? 0,
                });

                return commits.map((cm) => ({
                  __typename: "Commit",
                  owner,
                  repo,
                  oid: cm.sha,
                  message: cm.message,
                  author: cm.author,
                  committer: cm.committer,
                  parents: cm.parents,
                }));
              },
            );
          },
        },
      },

      Tree: {
        plans: {
          oid($tree: any) {
            return lambda($tree, (tree) => (tree as any)?.oid ?? null);
          },
          repository($tree: any) {
            return lambda($tree, (tree) => {
              const t = tree as any;
              return t ? { owner: t.owner, repo: t.repo } : null;
            });
          },
          entries($tree: any) {
            return lambda($tree, (tree) => (tree as any)?.entries ?? []);
          },
        },
      },

      TreeEntry: {
        plans: {
          name($entry: any) {
            return lambda($entry, (entry) => (entry as any)?.name ?? null);
          },
          path($entry: any) {
            return lambda($entry, (entry) => (entry as any)?.path ?? null);
          },
          type($entry: any) {
            return lambda($entry, (entry) => (entry as any)?.type ?? null);
          },
          mode($entry: any) {
            return lambda($entry, (entry) => (entry as any)?.mode ?? null);
          },
          oid($entry: any) {
            return lambda($entry, (entry) => (entry as any)?.oid ?? null);
          },
          object($entry: any) {
            return lambda($entry, async (entry) => {
              const e = entry as TreeEntryData | null;
              if (!e) return null;
              const { type, oid, owner, repo, commitOid, path } = e;

              if (type === "tree") {
                const entries = await gitService.getTree(
                  owner,
                  repo,
                  commitOid,
                  path,
                );
                return {
                  __typename: "Tree",
                  owner,
                  repo,
                  oid,
                  entries: entries.map((en) => ({
                    ...en,
                    name: en.path,
                    path: `${path}/${en.path}`,
                    owner,
                    repo,
                    commitOid,
                  })),
                };
              }

              if (type === "blob") {
                const content = await gitService.getFileContent(
                  owner,
                  repo,
                  commitOid,
                  path,
                );
                const raw = await gitService.getFileRaw(
                  owner,
                  repo,
                  commitOid,
                  path,
                );

                const isBinary = content === null && raw !== null;
                const byteSize = raw?.length ?? 0;

                return {
                  __typename: "Blob",
                  owner,
                  repo,
                  oid,
                  text: isBinary ? null : content,
                  byteSize,
                  isBinary,
                };
              }

              return null;
            });
          },
        },
      },

      Blob: {
        plans: {
          oid($blob: any) {
            return lambda($blob, (blob) => (blob as any)?.oid ?? null);
          },
          repository($blob: any) {
            return lambda($blob, (blob) => {
              const b = blob as any;
              return b ? { owner: b.owner, repo: b.repo } : null;
            });
          },
          text($blob: any) {
            return lambda($blob, (blob) => (blob as any)?.text ?? null);
          },
          byteSize($blob: any) {
            return lambda($blob, (blob) => (blob as any)?.byteSize ?? 0);
          },
          isBinary($blob: any) {
            return lambda($blob, (blob) => (blob as any)?.isBinary ?? false);
          },
        },
      },

      RefConnection: {
        plans: {
          nodes($conn: any) {
            return lambda($conn, (conn) => (conn as any)?.nodes ?? []);
          },
          totalCount($conn: any) {
            return lambda($conn, (conn) => (conn as any)?.totalCount ?? 0);
          },
        },
      },

      Repository: {
        plans: {
          ref($repository: any, fieldArgs: FieldArgs) {
            const $qualifiedName = fieldArgs.getRaw("qualifiedName");

            return lambda(
              object({
                repository: $repository,
                qualifiedName: $qualifiedName,
              }),
              async (args) => {
                const { repository, qualifiedName } = args as any;
                if (!repository || !qualifiedName) return null;

                const owner = await getOwnerSlug(repository);
                const repo = repository.slug;

                const exists = await repositoryService.exists(owner, repo);
                if (!exists) return null;

                let prefix: string;
                let name: string;

                if (qualifiedName.startsWith("refs/heads/")) {
                  prefix = "refs/heads/";
                  name = qualifiedName.slice(11);
                } else if (qualifiedName.startsWith("refs/tags/")) {
                  prefix = "refs/tags/";
                  name = qualifiedName.slice(10);
                } else {
                  return null;
                }

                const sha = await gitService.resolveRef(
                  owner,
                  repo,
                  qualifiedName,
                );
                if (!sha) return null;

                return { prefix, name, sha, owner, repo };
              },
            );
          },

          refs($repository: any, fieldArgs: FieldArgs) {
            const $refPrefix = fieldArgs.getRaw("refPrefix");
            const $first = fieldArgs.getRaw("first");

            return lambda(
              object({
                repository: $repository,
                refPrefix: $refPrefix,
                first: $first,
              }),
              async (args) => {
                const { repository, refPrefix, first } = args as any;
                if (!repository) {
                  return { nodes: [], totalCount: 0 };
                }

                const owner = await getOwnerSlug(repository);
                const repo = repository.slug;

                const exists = await repositoryService.exists(owner, repo);
                if (!exists) {
                  return { nodes: [], totalCount: 0 };
                }

                let refs: RefData[] = [];

                if (refPrefix === "refs/heads/") {
                  const branches = await gitService.listBranches(owner, repo);
                  refs = branches.map((b) => ({
                    prefix: "refs/heads/",
                    name: b.name,
                    sha: b.sha,
                    owner,
                    repo,
                  }));
                } else if (refPrefix === "refs/tags/") {
                  const tags = await gitService.listTags(owner, repo);
                  refs = tags.map((t) => ({
                    prefix: "refs/tags/",
                    name: t.name,
                    sha: t.sha,
                    owner,
                    repo,
                  }));
                }

                const limited = refs.slice(0, first ?? 100);

                return { nodes: limited, totalCount: refs.length };
              },
            );
          },

          defaultBranchRef($repository: any) {
            return lambda($repository, async (repository) => {
              const r = repository as any;
              if (!r) return null;

              const owner = await getOwnerSlug(r);
              const repo = r.slug;
              const defaultBranch = r.defaultBranch || "main";

              const exists = await repositoryService.exists(owner, repo);
              if (!exists) return null;

              const sha = await gitService.resolveRef(
                owner,
                repo,
                `refs/heads/${defaultBranch}`,
              );
              if (!sha) return null;

              return {
                prefix: "refs/heads/",
                name: defaultBranch,
                sha,
                owner,
                repo,
              };
            });
          },

          commit($repository: any, fieldArgs: FieldArgs) {
            const $sha = fieldArgs.getRaw("sha");

            return lambda(
              object({ repository: $repository, sha: $sha }),
              async (args) => {
                const { repository, sha } = args as any;
                if (!repository || !sha) return null;

                const owner = await getOwnerSlug(repository);
                const repo = repository.slug;

                const exists = await repositoryService.exists(owner, repo);
                if (!exists) return null;

                const commit = await gitService.getCommit(owner, repo, sha);
                if (!commit) return null;

                return {
                  __typename: "Commit",
                  owner,
                  repo,
                  oid: commit.sha,
                  message: commit.message,
                  author: commit.author,
                  committer: commit.committer,
                  parents: commit.parents,
                };
              },
            );
          },
        },
      },
    },

    interfaces: {
      GitObject: {
        resolveType(obj: any) {
          return (obj as any)?.__typename ?? null;
        },
      },
    },
  };
});

// Helper to get owner slug from repository
async function getOwnerSlug(repository: any): Promise<string> {
  if (repository.organization?.slug) {
    return repository.organization.slug;
  }
  if (repository.owner?.username) {
    return repository.owner.username;
  }
  if (repository.owner?.slug) {
    return repository.owner.slug;
  }
  return repository.ownerId;
}

// Type definitions for internal data structures
interface RefData {
  prefix: string;
  name: string;
  sha: string;
  owner: string;
  repo: string;
}

interface CommitData {
  owner: string;
  repo: string;
  oid: string;
  message: string;
  author: { name: string; email: string; timestamp: number };
  committer: { name: string; email: string; timestamp: number };
  parents: string[];
}

interface TreeEntryData {
  name: string;
  path: string;
  type: "blob" | "tree" | "commit";
  mode: string;
  oid: string;
  owner: string;
  repo: string;
  commitOid: string;
}

export default GitTypesPlugin;
