---
"@omnidotdev/arbor-api": patch
---

Merging a pull request now only fast-forwards its target branch. When the target has moved on since the branch was created, the merge is refused with "The branch is out of date with its target, update it first and try again", instead of creating a merge commit that silently dropped the target's newer work. Stack merges are fast-forward only too: a change whose base branch has moved on is refused with "The change is out of date with its base branch, update it first and try again" rather than merged over it. Branches with no shared history are refused with "No common ancestor found", for pull request and stack merges alike. Pull request merges now also enforce the target branch's protection rules (required approvals and passing required checks), as stack merges already did. Branch and tag names that would point at a ref of the other kind (such as a tag named `refs/heads/master`) are rejected, so deleting a tag can never delete a branch
