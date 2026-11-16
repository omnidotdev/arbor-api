/**
 * Authorization plugin that fixes every key column after insert.
 *
 * The update wrappers authorize against the row as it stands: its current
 * repository, owner, stack, or pull request. A patch that could rewrite those
 * columns would let a caller authorized on their own row repoint it at another
 * workspace's: move a pull request comment, review, branch protection rule,
 * project membership, or topic into a repository they cannot write, transfer a
 * project or agent into an organization they hold no role in, or link a change
 * to another repository's approved pull request. Authorizing the destination in
 * each wrapper is easy to miss on the next table, so the columns are simply not
 * patchable.
 *
 * Every column in a primary key or a foreign key loses the `update` behavior,
 * which removes it from the generated `*Patch` input types. Inserts are
 * untouched (each create wrapper authorizes the references it is given), and so
 * are the mutation's own key arguments, which come from the constraint rather
 * than the attribute. Existing behavior tags are appended after, so an explicit
 * smart tag can still opt a column back in.
 * @see https://postgraphile.org/postgraphile/5/behavior
 */
const ImmutableReferencesPlugin: GraphileConfig.Plugin = {
  name: "ImmutableReferencesPlugin",
  version: "0.0.0",
  gather: {
    hooks: {
      pgIntrospection_introspection(_info, event) {
        const { introspection } = event;

        for (const pgConstraint of introspection.constraints) {
          if (pgConstraint.contype !== "p" && pgConstraint.contype !== "f") {
            continue;
          }

          for (const pgAttribute of pgConstraint.getAttributes() ?? []) {
            const tags = pgAttribute.getTags();
            const newBehavior = ["-update"];
            if (typeof tags.behavior === "string") {
              newBehavior.push(tags.behavior);
            } else if (Array.isArray(tags.behavior)) {
              newBehavior.push(...(tags.behavior as string[]));
            }
            tags.behavior = newBehavior;
          }
        }
      },
    },
  },
};

export default ImmutableReferencesPlugin;
