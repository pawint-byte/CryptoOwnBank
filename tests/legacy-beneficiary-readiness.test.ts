import { describe, expect, it } from "vitest";
import {
  getStalePassphraseBeneficiaries,
  summarizeLegacyBeneficiaries,
} from "../server/lib/legacy-beneficiary-readiness";

describe("Legacy Plan beneficiary readiness counts", () => {
  const rows = [
    { id: "kid-1", name: "Kid 1", email: "kid1@example.test", assignmentId: null, confirmationStatus: "confirmed", encryptedVault: "vault", vaultVerificationCapsule: "capsule", vaultVerifiedAt: null },
    { id: "assignment-1a", name: "Kid 1", email: "KID1@example.test", assignmentId: "wallet-1", confirmationStatus: "confirmed", encryptedVault: "vault", vaultVerificationCapsule: "capsule", vaultVerifiedAt: null },
    { id: "assignment-1b", name: "Kid 1", email: " kid1@example.test ", assignmentId: "wallet-2", confirmationStatus: "confirmed", encryptedVault: "vault", vaultVerificationCapsule: "capsule", vaultVerifiedAt: null },
    { id: "kid-2", name: "Kid 2", email: "kid2@example.test", assignmentId: null, confirmationStatus: "confirmed", encryptedVault: "vault", vaultVerificationCapsule: "capsule", vaultVerifiedAt: "2026-08-01T00:00:00.000Z" },
    { id: "assignment-2a", name: "Kid 2", email: "kid2@example.test", assignmentId: "wallet-3", confirmationStatus: "pending", encryptedVault: "vault", vaultVerificationCapsule: "capsule", vaultVerifiedAt: null },
    { id: "kid-3", name: "Kid 3", email: "kid3@example.test", assignmentId: null, confirmationStatus: "pending", encryptedVault: "vault", vaultVerificationCapsule: "capsule", vaultVerifiedAt: null },
    { id: "assignment-3a", name: "Kid 3", email: "kid3@example.test", assignmentId: "wallet-4", confirmationStatus: "pending", encryptedVault: "vault", vaultVerificationCapsule: "capsule", vaultVerifiedAt: null },
  ];

  it("counts many assignment rows as exactly three beneficiaries", () => {
    const summary = summarizeLegacyBeneficiaries(rows);

    expect(summary.uniqueBeneficiaries.map((beneficiary) => beneficiary.beneficiaryId)).toEqual([
      "kid-1",
      "kid-2",
      "kid-3",
    ]);
    expect(summary.totalBeneficiaries).toBe(3);
    expect(summary.confirmedBeneficiaries).toBe(2);
  });

  it("counts people missing passphrase verification once each", () => {
    const summary = summarizeLegacyBeneficiaries(rows);
    const stale = getStalePassphraseBeneficiaries(
      summary.uniqueBeneficiaries,
      new Date("2026-09-05T00:00:00.000Z").getTime(),
      180 * 86_400_000,
    );

    expect(stale.map((beneficiary) => beneficiary.beneficiaryId)).toEqual(["kid-1", "kid-3"]);
  });
});