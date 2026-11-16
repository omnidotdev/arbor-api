import { wrapPlans } from "postgraphile/utils";

import {
  authorizeChangeCreate,
  authorizeChangeDelete,
  authorizeChangeUpdate,
  authorizeStackCreate,
  authorizeStackDelete,
  authorizeStackUpdate,
  authorizeVerificationCheckAdmin,
  authorizeVerificationCheckCreate,
} from "./generatedMutationAuthorization";
import { guardMutation } from "./guardMutation";

/**
 * Authorization plugin for stacks, changes, and verification checks, matching
 * the rules the MCP tools already enforce for the same writes.
 *
 * - Stack create: write access to the repository, authored as the caller,
 *   attributed only to an agent the caller administers
 * - Stack update: write access; delete: the author with write access, or a
 *   repository admin
 * - Change create/update/delete: write access to the stack's repository, with
 *   the change, its parent, and any linked pull request in that same stack and
 *   repository
 * - Verification check create/update/delete: write access to the change's
 *   repository
 *
 * Neither a stack nor a change may be marked merged by a client; that status is
 * recorded only when the server lands the change
 */
const StackPlugin = wrapPlans({
  Mutation: {
    createStack: guardMutation([["input", "stack"]], authorizeStackCreate),
    updateStack: guardMutation(
      [
        ["input", "rowId"],
        ["input", "patch"],
      ],
      authorizeStackUpdate,
    ),
    deleteStack: guardMutation([["input", "rowId"]], authorizeStackDelete),

    createChange: guardMutation([["input", "change"]], authorizeChangeCreate),
    updateChange: guardMutation(
      [
        ["input", "rowId"],
        ["input", "patch"],
      ],
      authorizeChangeUpdate,
    ),
    deleteChange: guardMutation([["input", "rowId"]], authorizeChangeDelete),

    createVerificationCheck: guardMutation(
      [["input", "verificationCheck"]],
      authorizeVerificationCheckCreate,
    ),
    updateVerificationCheck: guardMutation(
      [["input", "rowId"]],
      authorizeVerificationCheckAdmin,
    ),
    deleteVerificationCheck: guardMutation(
      [["input", "rowId"]],
      authorizeVerificationCheckAdmin,
    ),
  },
});

export default StackPlugin;
