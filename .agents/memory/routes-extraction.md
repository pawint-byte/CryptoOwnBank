---
name: Routes module extraction safety
description: How to safely split a giant Express registerRoutes() closure into feature modules without runtime regressions.
---

Splitting one huge `export async function registerRoutes(app)` (hundreds of routes in one closure) into `server/routes/<feature>.ts` modules, each exporting `register<Feature>Routes(app)` called in-place to preserve registration order.

**The two real safety nets are `tsc --noEmit` + an actual app boot — NOT curl.**
**Why:** auth middleware returns 401 *before* the handler body runs, so curl never exercises handler references. A module can reference a symbol it never imported and curl still shows a healthy 401 JSON. Only tsc (`Cannot find name`) and boot (esbuild transform / runtime ReferenceError) catch it.

**Closure-level `await import(...)` is the silent killer.** The original closure is `async`, so a block may contain a top-level `const x = await import(...)`. A naive extractor emits a *non-async* `register<Feature>Routes`, and esbuild fails at load: `"await" can only be used inside an "async" function`. Fix: make that register fn `async` and `await` it at the call site (the orchestrator `registerRoutes` is already async, so ordering is preserved). Grep modules for 2-space-indented `await` to find these.

**Extractor must guard against closure-symbol leaks bidirectionally:** abort if the block uses a closure-level def that stays behind, or defines one used outside. Beware false positives from *locally-scoped* re-declarations of the same name (e.g. a handler-local `const escapeHtml` at deeper indent vs. a closure-level `function escapeHtml`) — an allow-list override is the pragmatic escape hatch after manual verification.

**When a feature's extraction-replacement call line lands inside an adjacent zone:** e.g. `registerTaxRoutes(app)` ends up physically inside the billing block. Two valid fixes: import it into that module (preserves order, slight coupling) or pull it back to the orchestrator. If left in the module, delete the now-dead import + call from the orchestrator.

**Leave pre-existing issues verbatim** (missing imports already broken in the original, BigInt/Set downlevelIteration, self-referential type inference). A structural refactor preserves behavior; fixing latent bugs belongs in a separate non-structural change.
