---
"@omnidotdev/arbor-api": patch
---

Creating and deleting branches, merging pull requests, pull request diffs (merge base and per-file contents), raw file downloads by blob id, and repository imports now always act on the current repository storage. Previously these could read or write an outdated copy, so a merge or new branch could fail or land somewhere it was never served from, and diffs could show stale content. Workspace storage limits are now measured against the real repository sizes, so they are enforced on push. While the git backend is unavailable these requests fail and recover on their own once it is back, and a push to a workspace repository is refused until its storage usage can be checked
