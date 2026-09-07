export type LegacyBeneficiaryReadinessRow = {
  id: string;
  name: string;
  email: string;
  assignmentId?: string | null;
  confirmationStatus?: string | null;
  encryptedVault?: string | null;
  vaultVerificationCapsule?: string | null;
  vaultVerifiedAt?: Date | string | null;
};

export type UniqueLegacyBeneficiary<T extends LegacyBeneficiaryReadinessRow> = {
  beneficiaryId: string;
  name: string;
  email: string;
  rows: T[];
};

export function groupUniqueLegacyBeneficiaries<T extends LegacyBeneficiaryReadinessRow>(
  rows: T[],
): UniqueLegacyBeneficiary<T>[] {
  const groups = new Map<string, T[]>();
  const canonicalKeyByEmail = new Map<string, string>();
  const canonicalKeyByName = new Map<string, string>();

  const meaningfulRows = rows.filter((row) => row.name.trim() || row.email.trim());
  const canonicalRows = meaningfulRows.filter((row) => !row.assignmentId);
  const assignmentRows = meaningfulRows.filter((row) => row.assignmentId);

  for (const row of canonicalRows) {
    const normalizedName = row.name.trim();
    const normalizedEmail = row.email.trim().toLowerCase();
    const normalizedNameKey = normalizedName.toLowerCase();
    const existingKey = normalizedEmail
      ? canonicalKeyByEmail.get(normalizedEmail)
      : canonicalKeyByName.get(normalizedNameKey);
    const key = existingKey ?? (normalizedEmail ? `email:${normalizedEmail}` : `id:${row.id}`);
    const existing = groups.get(key);
    if (existing) existing.push(row);
    else groups.set(key, [row]);
    if (normalizedEmail) canonicalKeyByEmail.set(normalizedEmail, key);
    if (normalizedNameKey) canonicalKeyByName.set(normalizedNameKey, key);
  }

  for (const row of assignmentRows) {
    const normalizedName = row.name.trim().toLowerCase();
    const normalizedEmail = row.email.trim().toLowerCase();
    const key =
      canonicalKeyByEmail.get(normalizedEmail) ??
      canonicalKeyByName.get(normalizedName) ??
      (normalizedEmail ? `email:${normalizedEmail}` : `id:${row.id}`);
    const existing = groups.get(key);
    if (existing) existing.push(row);
    else groups.set(key, [row]);
  }

  return Array.from(groups.values()).map((personRows) => {
    const canonical = personRows.find((row) => !row.assignmentId) ?? personRows[0];
    return {
      beneficiaryId: canonical.id,
      name: canonical.name,
      email: canonical.email,
      rows: personRows,
    };
  });
}

export function summarizeLegacyBeneficiaries<T extends LegacyBeneficiaryReadinessRow>(
  rows: T[],
) {
  const uniqueBeneficiaries = groupUniqueLegacyBeneficiaries(rows);
  return {
    uniqueBeneficiaries,
    totalBeneficiaries: uniqueBeneficiaries.length,
    confirmedBeneficiaries: uniqueBeneficiaries.filter((person) =>
      person.rows.some((row) => row.confirmationStatus === "confirmed"),
    ).length,
  };
}

export function getStalePassphraseBeneficiaries<T extends LegacyBeneficiaryReadinessRow>(
  beneficiaries: UniqueLegacyBeneficiary<T>[],
  now: number,
  staleAfterMs: number,
) {
  return beneficiaries.filter((person) => {
    const protectedRows = person.rows.filter(
      (row) => row.encryptedVault && row.vaultVerificationCapsule,
    );
    if (protectedRows.length === 0) return false;

    const verificationTimes = protectedRows
      .map((row) => row.vaultVerifiedAt ? new Date(row.vaultVerifiedAt).getTime() : 0)
      .filter((time) => Number.isFinite(time) && time > 0);
    if (verificationTimes.length === 0) return true;
    return now - Math.max(...verificationTimes) > staleAfterMs;
  });
}