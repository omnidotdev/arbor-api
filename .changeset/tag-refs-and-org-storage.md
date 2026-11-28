---
"@omnidotdev/arbor-api": patch
---

Deleting a tag now removes only that tag. Previously, deleting `refs/tags/<name>` deleted the branch with the same name instead, and creating a tag created a branch. Workspace repositories now resolve their storage the same way everywhere, so commit, branch, tag, diff, default-branch, rename, merge, and dependency-scan operations work for repositories owned by a workspace whose name differs from the owning member's username
