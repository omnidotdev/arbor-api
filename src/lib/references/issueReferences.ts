/**
 * Extract issue/task references from a change or pull request's text so Backfeed
 * (user feedback) and Runa (tasks/boards) can close their loop when the work
 * lands. Arbor stays agnostic about each product's ID scheme: it surfaces the
 * reference tokens, and every consumer interprets its own.
 *
 * References are keyword-anchored (GitHub-style: `closes RUNA-123`, `fixes
 * BF-45`), not bare IDs, so incidental tokens like `SHA-256` or `UTF-8` are not
 * mistaken for references. The captured ID is normalized to uppercase and the
 * result is deduplicated.
 */
const REFERENCE_PATTERN =
  /(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?|address(?:e[sd])?|refs?|see)\s+([a-z][a-z0-9]*-\d+)/gi;

/** The deduplicated, uppercased product-ID references linked in `text`. */
export const extractIssueReferences = (text: string): string[] => {
  const found = new Set<string>();
  for (const match of text.matchAll(REFERENCE_PATTERN)) {
    if (match[1]) found.add(match[1].toUpperCase());
  }
  return [...found];
};
