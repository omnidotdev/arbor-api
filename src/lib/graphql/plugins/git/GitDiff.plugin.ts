import { context, lambda, object } from "postgraphile/grafast";
import { extendSchema } from "postgraphile/utils";

import { gitService, repositoryService } from "lib/git";
import { getOwnerSlug } from "./GitTypes.plugin";

import type { ChangedFile, FileDiffContent } from "lib/git";
import type { ExecutableStep, FieldArgs } from "postgraphile/grafast";

/**
 * Resolved base and head for a pull request diff.
 */
interface PrRefs {
  owner: string;
  repo: string;
  baseSha: string | null;
  headSha: string;
}

/**
 * Resolve a pull request row to the owner/slug plus the base and head shas its
 * diff should be computed against.
 *
 * base = merge-base(target, source) so the diff shows only what the source
 * branch introduces; if there is no merge base (unrelated histories) it falls
 * back to the target tip. head = the source branch tip.
 */
async function resolvePrRefs(
  prId: string | null | undefined,
  db: any,
): Promise<PrRefs | null> {
  if (!prId || !db) return null;

  const pr = await db.query.pullRequestTable.findFirst({
    where: (table: any, { eq }: any) => eq(table.id, prId),
    with: {
      repository: { with: { owner: true, organization: true } },
    },
  });
  if (!pr?.repository) return null;

  const owner = await getOwnerSlug(pr.repository, db);
  if (!owner) return null;
  const repo = pr.repository.slug;

  const exists = await repositoryService.exists(owner, repo);
  if (!exists) return null;

  const headSha = await gitService.resolveRef(
    owner,
    repo,
    `refs/heads/${pr.sourceBranch}`,
  );
  if (!headSha) return null;

  let baseSha = await gitService.getMergeBase(
    owner,
    repo,
    `refs/heads/${pr.targetBranch}`,
    `refs/heads/${pr.sourceBranch}`,
  );
  if (!baseSha) {
    baseSha = await gitService.resolveRef(
      owner,
      repo,
      `refs/heads/${pr.targetBranch}`,
    );
  }

  return { owner, repo, baseSha, headSha };
}

/** Plan that reads a property off a plain object step */
const prop =
  (key: string, fallback: unknown = null) =>
  ($obj: ExecutableStep) =>
    lambda($obj, (obj) => (obj as Record<string, unknown>)?.[key] ?? fallback);

/**
 * Git diff plugin.
 *
 * Exposes the "Files changed" surface for pull requests and commits:
 * - ChangedFile: the cheap per-file list (status, oids, counts, binary/image)
 * - FileDiffContent: per-file old/new text, fetched lazily
 *
 * Diffs are computed in-process with isomorphic-git via gitService. Plans close
 * over gitService directly (the schema is built at boot with makeSchema, so no
 * EXPORTABLE wrapping is required).
 */
const GitDiffPlugin = extendSchema((_build) => {
  return {
    typeDefs: /* GraphQL */ `
      """
      The change status of a file within a diff.
      """
      enum DiffStatus {
        ADDED
        DELETED
        MODIFIED
        RENAMED
        COPIED
        TYPE_CHANGED
      }

      """
      A single file that changed between two refs (the cheap file-list entry).
      """
      type ChangedFile {
        """
        The file path at the head ref (or the base ref for deletions).
        """
        path: String!

        """
        The previous path when the file was renamed, otherwise null.
        """
        oldPath: String

        """
        How the file changed.
        """
        status: DiffStatus!

        """
        The blob oid at the base ref, or null when the file was added.
        """
        oldOid: String

        """
        The blob oid at the head ref, or null when the file was deleted.
        """
        newOid: String

        """
        Whether the file is binary (line counts are skipped for binary files).
        """
        isBinary: Boolean!

        """
        Whether the file is an image, derived from its extension.
        """
        isImage: Boolean!

        """
        Number of lines added.
        """
        additions: Int!

        """
        Number of lines removed.
        """
        deletions: Int!
      }

      """
      The old and new content of a single file, fetched lazily per file.
      """
      type FileDiffContent {
        """
        The file path.
        """
        path: String!

        """
        How the file changed.
        """
        status: DiffStatus!

        """
        Whether the file is binary.
        """
        isBinary: Boolean!

        """
        UTF-8 content at the base ref, or null when added or binary.
        """
        oldText: String

        """
        UTF-8 content at the head ref, or null when deleted or binary.
        """
        newText: String
      }

      extend type PullRequest {
        """
        The files changed by this pull request (merge-base of target and source
        to the source tip).
        """
        changedFiles: [ChangedFile!]!

        """
        The old and new content for a single changed file.
        """
        fileDiff(path: String!): FileDiffContent
      }

      extend type Commit {
        """
        The files changed by this commit relative to its first parent.
        """
        changedFiles: [ChangedFile!]!

        """
        The old and new content for a single changed file.
        """
        fileDiff(path: String!): FileDiffContent
      }
    `,

    objects: {
      ChangedFile: {
        plans: {
          path: prop("path"),
          oldPath: prop("oldPath"),
          status: prop("status"),
          oldOid: prop("oldOid"),
          newOid: prop("newOid"),
          isBinary: prop("isBinary", false),
          isImage: prop("isImage", false),
          additions: prop("additions", 0),
          deletions: prop("deletions", 0),
        },
      },

      FileDiffContent: {
        plans: {
          path: prop("path"),
          status: prop("status"),
          isBinary: prop("isBinary", false),
          oldText: prop("oldText"),
          newText: prop("newText"),
        },
      },

      PullRequest: {
        plans: {
          changedFiles($pr: any) {
            const $prId = $pr.get("id");
            const $db = context().get("db");

            return lambda(
              object({ prId: $prId, db: $db }),
              async (args): Promise<ChangedFile[]> => {
                const { prId, db } = args as { prId: string; db: any };
                const refs = await resolvePrRefs(prId, db);
                if (!refs) return [];
                return gitService.getChangedFiles(
                  refs.owner,
                  refs.repo,
                  refs.baseSha,
                  refs.headSha,
                );
              },
            );
          },

          fileDiff($pr: any, fieldArgs: FieldArgs) {
            const $prId = $pr.get("id");
            const $path = fieldArgs.getRaw("path");
            const $db = context().get("db");

            return lambda(
              object({ prId: $prId, path: $path, db: $db }),
              async (args): Promise<FileDiffContent | null> => {
                const { prId, path, db } = args as {
                  prId: string;
                  path: string;
                  db: any;
                };
                if (!path) return null;
                const refs = await resolvePrRefs(prId, db);
                if (!refs) return null;
                return gitService.getFileDiffContent(
                  refs.owner,
                  refs.repo,
                  refs.baseSha,
                  refs.headSha,
                  path,
                );
              },
            );
          },
        },
      },

      Commit: {
        plans: {
          changedFiles($commit: any) {
            return lambda($commit, async (commit): Promise<ChangedFile[]> => {
              const c = commit as {
                owner: string;
                repo: string;
                oid: string;
                parents?: string[];
              } | null;
              if (!c) return [];
              const base = c.parents?.[0] ?? null;
              return gitService.getChangedFiles(c.owner, c.repo, base, c.oid);
            });
          },

          fileDiff($commit: any, fieldArgs: FieldArgs) {
            const $path = fieldArgs.getRaw("path");

            return lambda(
              object({ commit: $commit, path: $path }),
              async (args): Promise<FileDiffContent | null> => {
                const { commit, path } = args as {
                  commit: {
                    owner: string;
                    repo: string;
                    oid: string;
                    parents?: string[];
                  } | null;
                  path: string;
                };
                if (!commit || !path) return null;
                const base = commit.parents?.[0] ?? null;
                return gitService.getFileDiffContent(
                  commit.owner,
                  commit.repo,
                  base,
                  commit.oid,
                  path,
                );
              },
            );
          },
        },
      },
    },
  };
});

export default GitDiffPlugin;
