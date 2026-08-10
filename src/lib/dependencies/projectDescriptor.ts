/**
 * Pure parsing and resolution for the in-repo project descriptor
 * (`arbor.project.json`), which lets a repository declare the projects it
 * belongs to. Kept pure so parsing and slug resolution are testable without a
 * database; the service reads the file and reconciles memberships from it.
 */

/**
 * Parse an `arbor.project.json` into the list of project slugs it declares.
 * Slugs are lowercased, trimmed, and de-duplicated; a missing or non-array
 * `projects` field yields none, and non-string entries are ignored. Throws on
 * input that is not valid JSON, matching a boundary parser.
 */
export const parseProjectDescriptor = (content: string): string[] => {
  const parsed: unknown = JSON.parse(content);

  if (!parsed || typeof parsed !== "object") return [];
  const projects = (parsed as Record<string, unknown>).projects;
  if (!Array.isArray(projects)) return [];

  const slugs: string[] = [];
  const seen = new Set<string>();
  for (const entry of projects) {
    if (typeof entry !== "string") continue;
    const slug = entry.trim().toLowerCase();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    slugs.push(slug);
  }
  return slugs;
};

/**
 * Resolve declared project slugs to the ids of the candidate projects that
 * carry them. Only slugs that match a candidate (a project the repository's
 * owner or organization holds) resolve; the rest are dropped, so a descriptor
 * cannot reference a project outside its owner's scope. Matching is
 * case-insensitive and the result is de-duplicated.
 */
export const resolveDescriptorProjectIds = (
  declaredSlugs: string[],
  candidates: { id: string; slug: string }[],
): string[] => {
  const idBySlug = new Map(
    candidates.map((project) => [project.slug.toLowerCase(), project.id]),
  );

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const slug of declaredSlugs) {
    const id = idBySlug.get(slug.toLowerCase());
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
};
