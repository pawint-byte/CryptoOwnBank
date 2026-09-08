---
name: Pre-build publishing triage
description: Check launch configuration before interpreting incomplete publishing logs as an infrastructure outage.
---

An attempt ending with `Security scan skipped: connection lost` does not establish the root cause. If no package-install or build-command output appears, inspect publishing build/run settings, runtime modules, and workflow configuration before recommending repeated retries.

**Why:** Repeated attempts showed only this warning while a source import had stripped the project's launch configuration. Restoring the missing settings allowed a local production build and startup to pass, but only a subsequent publish can establish whether that also resolves the remote interruption.

**How to apply:** Compare current launch settings with a successful build and configuration history. Restore only what is needed; retain the deployment target reported by the live service rather than blindly copying a stale target from history. Do not restore historical credentials or unrelated settings wholesale. Distinguish verified local build/startup results from unverified publishing success.