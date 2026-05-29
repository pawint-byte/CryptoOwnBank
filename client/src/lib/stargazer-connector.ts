declare global {
  interface Window {
    stargazer?: any;
  }
}

export const STARGAZER_INSTALL_URL =
  "https://chromewebstore.google.com/detail/stargazer-wallet/pgiaagfkgcbnmiiolekcfmljdagdhlcm";

export function isStargazerAvailable(): boolean {
  return typeof window !== "undefined" && !!window.stargazer;
}

export async function connectStargazerDag(): Promise<string> {
  if (!isStargazerAvailable()) {
    throw new Error(
      "Stargazer wallet not found. Install the Stargazer extension in a desktop browser (Chrome or Brave), then try again.",
    );
  }

  const provider = window.stargazer.getProvider("constellation");
  if (!provider) {
    throw new Error("Could not reach the Constellation network inside Stargazer.");
  }

  const accounts: string[] = await provider.request({
    method: "dag_requestAccounts",
    params: [],
  });

  if (!accounts || accounts.length === 0) {
    throw new Error("No DAG address was shared from Stargazer.");
  }

  return accounts[0];
}
