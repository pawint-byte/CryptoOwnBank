import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchJsonWithTimeout,
  RequestTimeoutError,
} from "../client/src/lib/fetch-json-with-timeout";

describe("fetchJsonWithTimeout", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns parsed JSON for a successful response", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(JSON.stringify([{ id: "wallet-1" }]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ) as unknown as typeof fetch;

    await expect(fetchJsonWithTimeout("/api/wallets", { fetchImpl }))
      .resolves.toEqual([{ id: "wallet-1" }]);
  });

  it("aborts a request that does not settle", async () => {
    vi.useFakeTimers();
    const fetchImpl = vi.fn((_url: RequestInfo | URL, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        }, { once: true });
      }),
    ) as unknown as typeof fetch;

    const request = fetchJsonWithTimeout("/api/wallets", {
      timeoutMs: 1_000,
      fetchImpl,
    });
    const assertion = expect(request).rejects.toBeInstanceOf(RequestTimeoutError);
    await vi.advanceTimersByTimeAsync(1_000);

    await assertion;
  });
});