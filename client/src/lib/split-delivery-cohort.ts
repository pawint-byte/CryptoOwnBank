type SplitDeliveryBeneficiary = {
  id: string;
  email?: string | null;
  splitPieces?: string | null;
  beneficiaryGroup?: string | null;
};

export function getSplitDeliveryCohort<T extends SplitDeliveryBeneficiary>(
  beneficiaries: T[],
  beneficiaryGroup?: string | null,
): T[] {
  const normalizedGroup = beneficiaryGroup?.trim().toLowerCase();
  const seen = new Set<string>();

  return beneficiaries.filter((beneficiary) => {
    if (!beneficiary.splitPieces?.trim()) return false;
    if (
      normalizedGroup &&
      beneficiary.beneficiaryGroup?.trim().toLowerCase() !== normalizedGroup
    ) {
      return false;
    }

    const normalizedEmail = beneficiary.email?.trim().toLowerCase();
    const identity = normalizedEmail ? `email:${normalizedEmail}` : `id:${beneficiary.id}`;
    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });
}