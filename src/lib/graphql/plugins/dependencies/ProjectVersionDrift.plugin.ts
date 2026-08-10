import { EXPORTABLE } from "graphile-export";
import { context, lambda, object } from "postgraphile/grafast";
import { extendSchema } from "postgraphile/utils";

import { projectVersionDrift } from "lib/dependencies";

import type { FieldArgs } from "postgraphile/grafast";

/**
 * Custom query exposing a project's version drift: external packages its
 * repositories depend on at inconsistent versions, flattened to one row per
 * (package, version, repository) so the client can render a heatmap. It answers
 * "which shared dependencies are out of step" and scopes an align-the-versions
 * change. Visibility is enforced in the service (an invisible project or member
 * repository yields nothing), so this cannot leak a private repository.
 */
const ProjectVersionDriftPlugin = extendSchema(() => {
  return {
    typeDefs: /* GraphQL */ `
      """
      One (package, version, repository) cell of a project's version-drift view.
      """
      type VersionDriftEntry {
        """The package manager (npm, cargo, go, pip)."""
        packageManager: String

        """The package name."""
        packageName: String

        """The version constraint this repository declares (null = unpinned)."""
        versionConstraint: String

        """The depending repository's row id."""
        repositoryId: UUID

        """The depending repository's name."""
        name: String

        """The depending repository's slug."""
        slug: String

        """The owner username, for a personal repository."""
        ownerUsername: String

        """The organization slug, for an organization repository."""
        organizationSlug: String
      }

      extend type Query {
        """
        External packages the project's repositories depend on at inconsistent
        versions, one row per package/version/repository. Only repositories the
        caller may see appear.
        """
        projectVersionDrift(projectId: UUID!): [VersionDriftEntry!]
      }
    `,

    objects: {
      VersionDriftEntry: {
        plans: {
          packageManager: EXPORTABLE(
            (lambda) => ($e: any) =>
              lambda($e, (e) => (e as any)?.packageManager ?? null),
            [lambda],
          ),
          packageName: EXPORTABLE(
            (lambda) => ($e: any) =>
              lambda($e, (e) => (e as any)?.packageName ?? null),
            [lambda],
          ),
          versionConstraint: EXPORTABLE(
            (lambda) => ($e: any) =>
              lambda($e, (e) => (e as any)?.versionConstraint ?? null),
            [lambda],
          ),
          repositoryId: EXPORTABLE(
            (lambda) => ($e: any) =>
              lambda($e, (e) => (e as any)?.repositoryId ?? null),
            [lambda],
          ),
          name: EXPORTABLE(
            (lambda) => ($e: any) =>
              lambda($e, (e) => (e as any)?.name ?? null),
            [lambda],
          ),
          slug: EXPORTABLE(
            (lambda) => ($e: any) =>
              lambda($e, (e) => (e as any)?.slug ?? null),
            [lambda],
          ),
          ownerUsername: EXPORTABLE(
            (lambda) => ($e: any) =>
              lambda($e, (e) => (e as any)?.ownerUsername ?? null),
            [lambda],
          ),
          organizationSlug: EXPORTABLE(
            (lambda) => ($e: any) =>
              lambda($e, (e) => (e as any)?.organizationSlug ?? null),
            [lambda],
          ),
        },
      },

      Query: {
        plans: {
          projectVersionDrift: EXPORTABLE(
            (lambda, object, context, projectVersionDrift) =>
              (_$root: any, fieldArgs: FieldArgs) => {
                const $projectId = fieldArgs.getRaw("projectId");
                const $db = context().get("db");
                const $observer = context().get("observer");

                return lambda(
                  object({
                    projectId: $projectId,
                    db: $db,
                    observer: $observer,
                  }),
                  async (args: any) =>
                    await projectVersionDrift({
                      observer: args.observer,
                      db: args.db,
                      input: { projectId: args.projectId },
                    }),
                );
              },
            [lambda, object, context, projectVersionDrift],
          ),
        },
      },
    },
  };
});

export default ProjectVersionDriftPlugin;
