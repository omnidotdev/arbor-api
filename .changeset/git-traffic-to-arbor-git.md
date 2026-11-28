---
"@omnidotdev/arbor-api": patch
---

Clones, fetches, and pushes over HTTPS now always go to the current repository storage. Previously, if the API started while the git backend was still coming up, it kept serving older copies for the rest of its uptime, so recently created repositories failed to clone with "does not appear to be a git repository" and older repositories could return outdated contents. While the backend is unavailable, git requests now fail and recover on their own once it is back
