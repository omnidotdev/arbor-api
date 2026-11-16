import { EXPORTABLE } from "graphile-export";
import { context, sideEffect } from "postgraphile/grafast";
import { wrapPlans } from "postgraphile/utils";

import {
  authorizeReviewCreate,
  authorizeReviewUpdate,
} from "./generatedMutationAuthorization";
import { guardMutation } from "./guardMutation";

import type { PlanWrapperFn } from "postgraphile/utils";

/**
 * Validate pull request review deletion: the reviewer only.
 */
const validateDelete = EXPORTABLE(
  (context, sideEffect): PlanWrapperFn =>
    (plan, _, fieldArgs) => {
      const $rowId = fieldArgs.getRaw(["input", "rowId"]);
      const $observer = context().get("observer");
      const $db = context().get("db");

      sideEffect([$rowId, $observer, $db], async ([rowId, observer, db]) => {
        if (!observer) throw new Error("Unauthorized");

        const review = await db.query.pullRequestReviewTable.findFirst({
          where: (table, { eq }) => eq(table.id, rowId),
        });

        if (!review) throw new Error("Unauthorized");

        if (review.reviewerId !== observer.id) throw new Error("Unauthorized");
      });

      return plan();
    },
  [context, sideEffect],
);

/**
 * Authorization plugin for pull request reviews.
 *
 * - Create: Any user who can see the target pull request; reviewer pinned to
 *   the authenticated user. An approval counts toward required approvals, so it
 *   needs write access to the repository and may not come from the pull
 *   request's author
 * - Update: Reviewer only, with the same rule for a move to approved
 * - Delete: Reviewer only
 *
 * The pull request and reviewer are fixed after creation
 * (ImmutableReferences.plugin.ts)
 */
const PullRequestReviewPlugin = wrapPlans({
  Mutation: {
    createPullRequestReview: guardMutation(
      [["input", "pullRequestReview"]],
      authorizeReviewCreate,
    ),
    updatePullRequestReview: guardMutation(
      [
        ["input", "rowId"],
        ["input", "patch"],
      ],
      authorizeReviewUpdate,
    ),
    deletePullRequestReview: validateDelete,
  },
});

export default PullRequestReviewPlugin;
