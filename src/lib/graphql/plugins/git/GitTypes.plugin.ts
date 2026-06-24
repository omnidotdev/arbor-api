import { EXPORTABLE } from "graphile-export";
import { context, lambda, object } from "postgraphile/grafast";
import { extendSchema } from "postgraphile/utils";

import { gitService, repositoryService } from "lib/git";

import type { FieldArgs } from "postgraphile/grafast";

// Helper to get owner slug from repository - exported for EXPORTABLE
// This function queries the database when relations are not loaded
export async function getOwnerSlug(
  repository: any,
  db: any,
): Promise<string | null> {
  // Try organization slug first
  if (repository.organization?.slug) {
    return repository.organization.slug;
  }
  // Try owner username from loaded relation
  if (repository.owner?.username) {
    return repository.owner.username;
  }
  if (repository.owner?.slug) {
    return repository.owner.slug;
  }

  // If organizationId is set, fetch the organization slug from DB
  if (repository.organizationId && db) {
    const org = await db.query.organizationTable.findFirst({
      where: (table: any, { eq }: any) =>
        eq(table.id, repository.organizationId),
      columns: { slug: true },
    });
    if (org?.slug) {
      return org.slug;
    }
  }

  // Fetch the owner username from DB using ownerId
  if (repository.ownerId && db) {
    const user = await db.query.userTable.findFirst({
      where: (table: any, { eq }: any) => eq(table.id, repository.ownerId),
      columns: { username: true },
    });
    if (user?.username) {
      return user.username;
    }
  }

  return null;
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
const GitTypesPlugin = extendSchema((_build) => {
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
        The reference name without the prefix (e.g., "master" for refs/heads/master).
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
          name: EXPORTABLE(
            (lambda) => ($actor: any) => {
              return lambda($actor, (actor) => (actor as any)?.name ?? null);
            },
            [lambda],
          ),
          email: EXPORTABLE(
            (lambda) => ($actor: any) => {
              return lambda($actor, (actor) => (actor as any)?.email ?? null);
            },
            [lambda],
          ),
          date: EXPORTABLE(
            (lambda) => ($actor: any) => {
              return lambda($actor, (actor) => {
                const a = actor as any;
                return a?.timestamp
                  ? new Date(a.timestamp * 1000).toISOString()
                  : null;
              });
            },
            [lambda],
          ),
        },
      },

      Ref: {
        plans: {
          id: EXPORTABLE(
            (lambda) => ($ref: any) => {
              return lambda($ref, (ref) => {
                const r = ref as { prefix: string; name: string } | null;
                return r ? `${r.prefix}${r.name}` : null;
              });
            },
            [lambda],
          ),
          name: EXPORTABLE(
            (lambda) => ($ref: any) => {
              return lambda($ref, (ref) => (ref as any)?.name ?? null);
            },
            [lambda],
          ),
          prefix: EXPORTABLE(
            (lambda) => ($ref: any) => {
              return lambda($ref, (ref) => (ref as any)?.prefix ?? null);
            },
            [lambda],
          ),
          target: EXPORTABLE(
            (lambda, repositoryService, gitService) => ($ref: any) => {
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
            [lambda, repositoryService, gitService],
          ),
        },
      },

      Commit: {
        plans: {
          oid: EXPORTABLE(
            (lambda) => ($commit: any) => {
              return lambda($commit, (commit) => (commit as any)?.oid ?? null);
            },
            [lambda],
          ),
          repository: EXPORTABLE(
            (lambda) => ($commit: any) => {
              return lambda($commit, (commit) => {
                const c = commit as CommitData | null;
                return c ? { owner: c.owner, repo: c.repo } : null;
              });
            },
            [lambda],
          ),
          message: EXPORTABLE(
            (lambda) => ($commit: any) => {
              return lambda(
                $commit,
                (commit) => (commit as any)?.message ?? null,
              );
            },
            [lambda],
          ),
          messageHeadline: EXPORTABLE(
            (lambda) => ($commit: any) => {
              return lambda(
                $commit,
                (commit) => (commit as any)?.message?.split("\n")[0] ?? "",
              );
            },
            [lambda],
          ),
          author: EXPORTABLE(
            (lambda) => ($commit: any) => {
              return lambda(
                $commit,
                (commit) => (commit as any)?.author ?? null,
              );
            },
            [lambda],
          ),
          committer: EXPORTABLE(
            (lambda) => ($commit: any) => {
              return lambda(
                $commit,
                (commit) => (commit as any)?.committer ?? null,
              );
            },
            [lambda],
          ),
          authoredDate: EXPORTABLE(
            (lambda) => ($commit: any) => {
              return lambda($commit, (commit) => {
                const c = commit as any;
                return c?.author?.timestamp
                  ? new Date(c.author.timestamp * 1000).toISOString()
                  : null;
              });
            },
            [lambda],
          ),
          committedDate: EXPORTABLE(
            (lambda) => ($commit: any) => {
              return lambda($commit, (commit) => {
                const c = commit as any;
                return c?.committer?.timestamp
                  ? new Date(c.committer.timestamp * 1000).toISOString()
                  : null;
              });
            },
            [lambda],
          ),
          tree: EXPORTABLE(
            (lambda, gitService) => ($commit: any) => {
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
            [lambda, gitService],
          ),
          parents: EXPORTABLE(
            (lambda, gitService) => ($commit: any) => {
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
            [lambda, gitService],
          ),
          history: EXPORTABLE(
            (lambda, object, gitService) =>
              ($commit: any, fieldArgs: FieldArgs) => {
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
            [lambda, object, gitService],
          ),
        },
      },

      Tree: {
        plans: {
          oid: EXPORTABLE(
            (lambda) => ($tree: any) => {
              return lambda($tree, (tree) => (tree as any)?.oid ?? null);
            },
            [lambda],
          ),
          repository: EXPORTABLE(
            (lambda) => ($tree: any) => {
              return lambda($tree, (tree) => {
                const t = tree as any;
                return t ? { owner: t.owner, repo: t.repo } : null;
              });
            },
            [lambda],
          ),
          entries: EXPORTABLE(
            (lambda) => ($tree: any) => {
              return lambda($tree, (tree) => (tree as any)?.entries ?? []);
            },
            [lambda],
          ),
        },
      },

      TreeEntry: {
        plans: {
          name: EXPORTABLE(
            (lambda) => ($entry: any) => {
              return lambda($entry, (entry) => (entry as any)?.name ?? null);
            },
            [lambda],
          ),
          path: EXPORTABLE(
            (lambda) => ($entry: any) => {
              return lambda($entry, (entry) => (entry as any)?.path ?? null);
            },
            [lambda],
          ),
          type: EXPORTABLE(
            (lambda) => ($entry: any) => {
              return lambda($entry, (entry) => (entry as any)?.type ?? null);
            },
            [lambda],
          ),
          mode: EXPORTABLE(
            (lambda) => ($entry: any) => {
              return lambda($entry, (entry) => (entry as any)?.mode ?? null);
            },
            [lambda],
          ),
          oid: EXPORTABLE(
            (lambda) => ($entry: any) => {
              return lambda($entry, (entry) => (entry as any)?.oid ?? null);
            },
            [lambda],
          ),
          object: EXPORTABLE(
            (lambda, gitService) => ($entry: any) => {
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
            [lambda, gitService],
          ),
        },
      },

      Blob: {
        plans: {
          oid: EXPORTABLE(
            (lambda) => ($blob: any) => {
              return lambda($blob, (blob) => (blob as any)?.oid ?? null);
            },
            [lambda],
          ),
          repository: EXPORTABLE(
            (lambda) => ($blob: any) => {
              return lambda($blob, (blob) => {
                const b = blob as any;
                return b ? { owner: b.owner, repo: b.repo } : null;
              });
            },
            [lambda],
          ),
          text: EXPORTABLE(
            (lambda) => ($blob: any) => {
              return lambda($blob, (blob) => (blob as any)?.text ?? null);
            },
            [lambda],
          ),
          byteSize: EXPORTABLE(
            (lambda) => ($blob: any) => {
              return lambda($blob, (blob) => (blob as any)?.byteSize ?? 0);
            },
            [lambda],
          ),
          isBinary: EXPORTABLE(
            (lambda) => ($blob: any) => {
              return lambda($blob, (blob) => (blob as any)?.isBinary ?? false);
            },
            [lambda],
          ),
        },
      },

      RefConnection: {
        plans: {
          nodes: EXPORTABLE(
            (lambda) => ($conn: any) => {
              return lambda($conn, (conn) => (conn as any)?.nodes ?? []);
            },
            [lambda],
          ),
          totalCount: EXPORTABLE(
            (lambda) => ($conn: any) => {
              return lambda($conn, (conn) => (conn as any)?.totalCount ?? 0);
            },
            [lambda],
          ),
        },
      },

      Repository: {
        plans: {
          ref: EXPORTABLE(
            (
              lambda,
              object,
              context,
              getOwnerSlug,
              repositoryService,
              gitService,
            ) =>
              ($repository: any, fieldArgs: FieldArgs) => {
                const $qualifiedName = fieldArgs.getRaw("qualifiedName");
                const $db = context().get("db");

                return lambda(
                  object({
                    repository: $repository,
                    qualifiedName: $qualifiedName,
                    db: $db,
                  }),
                  async (args) => {
                    const { repository, qualifiedName, db } = args as any;
                    if (!repository || !qualifiedName) return null;

                    const owner = await getOwnerSlug(repository, db);
                    if (!owner) return null;
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
            [
              lambda,
              object,
              context,
              getOwnerSlug,
              repositoryService,
              gitService,
            ],
          ),

          refs: EXPORTABLE(
            (
              lambda,
              object,
              context,
              getOwnerSlug,
              repositoryService,
              gitService,
            ) =>
              ($repository: any, fieldArgs: FieldArgs) => {
                const $refPrefix = fieldArgs.getRaw("refPrefix");
                const $first = fieldArgs.getRaw("first");
                const $db = context().get("db");

                return lambda(
                  object({
                    repository: $repository,
                    refPrefix: $refPrefix,
                    first: $first,
                    db: $db,
                  }),
                  async (args) => {
                    const { repository, refPrefix, first, db } = args as any;
                    if (!repository) {
                      return { nodes: [], totalCount: 0 };
                    }

                    const owner = await getOwnerSlug(repository, db);
                    if (!owner) {
                      return { nodes: [], totalCount: 0 };
                    }
                    const repo = repository.slug;

                    const exists = await repositoryService.exists(owner, repo);
                    if (!exists) {
                      return { nodes: [], totalCount: 0 };
                    }

                    let refs: Array<{
                      prefix: string;
                      name: string;
                      sha: string;
                      owner: string;
                      repo: string;
                    }> = [];

                    if (refPrefix === "refs/heads/") {
                      const branches = await gitService.listBranches(
                        owner,
                        repo,
                      );
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
            [
              lambda,
              object,
              context,
              getOwnerSlug,
              repositoryService,
              gitService,
            ],
          ),

          defaultBranchRef: EXPORTABLE(
            (
              lambda,
              object,
              context,
              getOwnerSlug,
              repositoryService,
              gitService,
            ) =>
              ($repository: any) => {
                const $db = context().get("db");

                return lambda(
                  object({ repository: $repository, db: $db }),
                  async (args) => {
                    const { repository, db } = args as any;
                    const r = repository as any;
                    if (!r) return null;

                    const owner = await getOwnerSlug(r, db);
                    if (!owner) return null;
                    const repo = r.slug;
                    const defaultBranch = r.defaultBranch || "master";

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
                  },
                );
              },
            [
              lambda,
              object,
              context,
              getOwnerSlug,
              repositoryService,
              gitService,
            ],
          ),

          commit: EXPORTABLE(
            (
              lambda,
              object,
              context,
              getOwnerSlug,
              repositoryService,
              gitService,
            ) =>
              ($repository: any, fieldArgs: FieldArgs) => {
                const $sha = fieldArgs.getRaw("sha");
                const $db = context().get("db");

                return lambda(
                  object({ repository: $repository, sha: $sha, db: $db }),
                  async (args) => {
                    const { repository, sha, db } = args as any;
                    if (!repository || !sha) return null;

                    const owner = await getOwnerSlug(repository, db);
                    if (!owner) return null;
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
            [
              lambda,
              object,
              context,
              getOwnerSlug,
              repositoryService,
              gitService,
            ],
          ),
        },
      },
    },

    interfaces: {
      GitObject: {
        resolveType: EXPORTABLE(
          () => (obj: any) => {
            return (obj as any)?.__typename ?? null;
          },
          [],
        ),
      },
    },
  };
});

export default GitTypesPlugin;
