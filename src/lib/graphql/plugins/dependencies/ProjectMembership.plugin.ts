import { EXPORTABLE } from "graphile-export";
import { context, lambda, object } from "postgraphile/grafast";
import { extendSchema } from "postgraphile/utils";

import { reconcileProjectMembership } from "lib/dependencies";

import type { FieldArgs } from "postgraphile/grafast";

/**
 * Custom mutation to reconcile a repository's project memberships from its
 * `arbor.project.json` descriptor at the default branch. Linking the repository
 * to each project it declares (and its owner holds) makes project membership
 * self-maintaining in the same way dependency discovery makes the graph
 * self-maintaining. Authorization (write access) lives in the service, so the
 * push hook and any agent surface share it without drift.
 */
const ProjectMembershipPlugin = extendSchema(() => {
  return {
    typeDefs: /* GraphQL */ `
      """
      Input for reconciling a repository's project memberships from its descriptor.
      """
      input ReconcileProjectMembershipInput {
        """
        The repository whose arbor.project.json to apply.
        """
        repositoryId: UUID!
      }

      """
      Payload for the reconcileProjectMembership mutation.
      """
      type ReconcileProjectMembershipPayload {
        """
        The number of projects the repository is now linked to via its descriptor.
        """
        linkedProjects: Int

        """
        A non-fatal reason reconciliation produced nothing (e.g. no descriptor).
        """
        error: String
      }

      extend type Mutation {
        """
        Apply a repository's arbor.project.json, linking it to the projects it
        declares (and its owner holds) and unlinking descriptor memberships it no
        longer declares. Manually added memberships are left untouched.
        """
        reconcileProjectMembership(
          input: ReconcileProjectMembershipInput!
        ): ReconcileProjectMembershipPayload
      }
    `,

    objects: {
      ReconcileProjectMembershipPayload: {
        plans: {
          linkedProjects: EXPORTABLE(
            (lambda) => ($payload: any) =>
              lambda($payload, (p) => (p as any)?.linkedProjects ?? null),
            [lambda],
          ),
          error: EXPORTABLE(
            (lambda) => ($payload: any) =>
              lambda($payload, (p) => (p as any)?.error ?? null),
            [lambda],
          ),
        },
      },

      Mutation: {
        plans: {
          reconcileProjectMembership: EXPORTABLE(
            (lambda, object, context, reconcileProjectMembership) =>
              (_$root: any, fieldArgs: FieldArgs) => {
                const $input = fieldArgs.getRaw("input");
                const $db = context().get("db");
                const $observer = context().get("observer");

                return lambda(
                  object({ input: $input, db: $db, observer: $observer }),
                  async (args: any) =>
                    await reconcileProjectMembership({
                      observer: args.observer,
                      db: args.db,
                      input: args.input,
                    }),
                );
              },
            [lambda, object, context, reconcileProjectMembership],
          ),
        },
      },
    },
  };
});

export default ProjectMembershipPlugin;
