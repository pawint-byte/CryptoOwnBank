import { Client } from "xrpl";

export const XRPL_WEBSOCKET_SERVERS = [
  "wss://s1.ripple.com",
  "wss://s2.ripple.com",
  "wss://xrplcluster.com",
] as const;

export const XRPL_CONNECTION_TIMEOUT_MS = 15_000;

export async function connectXrplClient(): Promise<{ client: Client; server: string }> {
  const failures: string[] = [];

  for (const server of XRPL_WEBSOCKET_SERVERS) {
    const client = new Client(server, {
      connectionTimeout: XRPL_CONNECTION_TIMEOUT_MS,
    });
    try {
      await client.connect();
      return { client, server };
    } catch (error) {
      failures.push(`${server}: ${error instanceof Error ? error.message : String(error)}`);
      try {
        await client.disconnect();
      } catch {}
    }
  }

  throw new Error(`Unable to connect to XRPL (${failures.join("; ")})`);
}