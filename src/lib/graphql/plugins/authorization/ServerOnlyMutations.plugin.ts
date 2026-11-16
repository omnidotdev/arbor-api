import { wrapPlans } from "postgraphile/utils";

import { denyMutation } from "./guardMutation";

/**
 * Backstop for generated mutations on server-written tables.
 *
 * SmartTag.plugin.ts hides these mutations from the schema. Each is refused here
 * as well, so dropping a tag cannot silently reopen the write:
 *
 * - Merge batches and queue entries are written by the merge queue service
 *   (enqueueStack, processMergeQueue), which gate on write access
 * - Tester applications are written by submitTesterApplication and the decision
 *   consumer; an `approved` row is what admits a user to the beta, so a client
 *   write would let anyone approve themselves or decide someone else's
 * - Pull requests are opened through openPullRequest, which assigns the number
 *   and binds the author to the caller
 */
const ServerOnlyMutationsPlugin = wrapPlans({
  Mutation: {
    createMergeBatch: denyMutation,
    updateMergeBatch: denyMutation,
    deleteMergeBatch: denyMutation,
    createMergeQueueEntry: denyMutation,
    updateMergeQueueEntry: denyMutation,
    deleteMergeQueueEntry: denyMutation,
    createTesterApplication: denyMutation,
    updateTesterApplication: denyMutation,
    deleteTesterApplication: denyMutation,
    createPullRequest: denyMutation,
  },
});

export default ServerOnlyMutationsPlugin;
