---
"@omnidotdev/arbor-api": patch
---

Agents, stacks, changes, and verification checks now enforce who may create, edit, or delete them: agents belong to the account that registers them (or a workspace owner or admin), and stack, change, and check writes need write access to the repository. An approval now requires write access and cannot come from the pull request's author. Editing a record can no longer move it to another repository, workspace, or owner, and merge queue entries, tester applications, and workspace billing links can only be changed by Arbor itself.
