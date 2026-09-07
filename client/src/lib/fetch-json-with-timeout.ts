export class RequestTimeoutError extends Error {
  constructor(message = "The request took too long and was cancelled.") {
    super(message);
    this.name = "RequestTimeoutError";
  }
}

type FetchJsonOptions = {
  timeoutMs?: number;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
};

export async function fetchJsonWithTimeout<T>(
  url: string,
  options: FetchJsonOptions = {},
): Promise<T> {
  const {
    timeoutMs = 15_000,
    signal,
    fetchImpl = fetch,
  } = options;
  const controller = new AbortController();
  let timedOut = false;

  const abortFromParent = () => controller.abort(signal?.reason);
  if (signal?.aborted) abortFromParent();
  else signal?.addEventListener("abort", abortFromParent, { once: true });

  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetchImpl(url, {
      credentials: "include",
      signal: controller.signal,
    });
    if (!response.ok) {
      const text = (await response.text()) || response.statusText;
      throw new Error(`${response.status}: ${text}`);
    }
    return await response.json() as T;
  } catch (error) {
    if (timedOut) throw new RequestTimeoutError();
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromParent);
  }
}