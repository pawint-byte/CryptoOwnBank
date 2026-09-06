---
name: SLIP-39 master-secret input
description: Required input representation for lossless SLIP-39 generation with the installed slip39 package.
---

Pass a plain JavaScript `number[]` to `slip39.fromArray`, never a Node.js `Buffer`.

**Why:** The library accepts a Buffer without throwing, but corrupts the first 16 bytes of the master secret. Recovery can report success while producing a different BIP-39 mnemonic.

**How to apply:** Convert entropy with `Array.from(Buffer.from(entropyHex, "hex"))`. Validate every generation change with a full threshold-shares round trip and exact recovered-mnemonic equality.