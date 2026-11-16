import { wrapPlans } from "postgraphile/utils";

import {
  authorizeAgentAdmin,
  authorizeAgentCreate,
} from "./generatedMutationAuthorization";
import { guardMutation } from "./guardMutation";

/**
 * Authorization plugin for agents.
 *
 * - Create: for the caller themselves; an organization agent needs an owner or
 *   admin role in that organization
 * - Update / delete: the agent's owner, or an owner or admin of its organization
 *
 * Owner and organization are fixed after creation (ImmutableReferences.plugin.ts)
 */
const AgentPlugin = wrapPlans({
  Mutation: {
    createAgent: guardMutation([["input", "agent"]], authorizeAgentCreate),
    updateAgent: guardMutation([["input", "rowId"]], authorizeAgentAdmin),
    deleteAgent: guardMutation([["input", "rowId"]], authorizeAgentAdmin),
  },
});

export default AgentPlugin;
