export function entropyHexToSlip39MasterSecret(entropyHex: string): number[] {
  return Array.from(Buffer.from(entropyHex, "hex"));
}