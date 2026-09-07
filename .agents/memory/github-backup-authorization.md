---
name: GitHub backup authorization
description: How to distinguish Git CLI credential failures from connector-level repository access failures during backups.
---

A healthy GitHub connector with broad repository OAuth scope does not necessarily populate Git's HTTPS credential helper, and OAuth scope does not override the authenticated account's repository ACL. Check the repository's `permissions.push` flag before attempting connector-based Git-data writes.

**Why:** A normal Git push can fail on stale HTTPS credentials while connector reads still succeed; connector writes can then fail because the connected account has read-only repository access. Reauthorization is not an ACL repair.

**How to apply:** For future backups, identify the branch and remote, test normal push, then inspect the connector identity and `permissions.push`. If it is false, require a write-capable account or repository grant rather than retrying writes, force-pushing, or creating a similarly named repository.