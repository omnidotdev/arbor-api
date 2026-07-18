/**
 * Authorization plugin that removes the global-node-id update/delete mutations
 * (the `update*ById` / `delete*ById` variants).
 *
 * Postgraphile generates two update/delete mutations per table: one keyed by the
 * primary key (`rowId`) and one keyed by the global node id (`*ById`). The
 * authorization plugins only wrap the `rowId` variants, so leaving the `*ById`
 * variants exposed would let a client bypass every rowId-based rule by calling
 * the node-id variant instead. The client uses only the `rowId` variants, so the
 * node-id variants are hidden here to close that gap.
 *
 * This disables the `nodeId:resource:update` / `nodeId:resource:delete` codec
 * behaviors that gate those mutations, while leaving the primary-key (`rowId`)
 * mutations, all queries, the `nodeId` field, and the `node(id:)` query intact.
 * @see https://postgraphile.org/postgraphile/5/behavior
 */
const NoNodeIdMutationsPlugin: GraphileConfig.Plugin = {
  name: "NoNodeIdMutationsPlugin",
  version: "0.0.0",
  gather: {
    hooks: {
      pgIntrospection_introspection(_info, event) {
        const { introspection } = event;
        for (const pgClass of introspection.classes) {
          const tags = pgClass.getTags();
          const newBehavior = [
            "-nodeId:resource:update",
            "-nodeId:resource:delete",
          ];
          if (typeof tags.behavior === "string") {
            newBehavior.push(tags.behavior);
          } else if (Array.isArray(tags.behavior)) {
            newBehavior.push(...(tags.behavior as string[]));
          }
          tags.behavior = newBehavior;
        }
      },
    },
  },
};

export default NoNodeIdMutationsPlugin;
