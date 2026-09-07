export type MergeableLegacyBeneficiary = {
  id: string;
  name: string;
  email: string;
  relationship?: string | null;
  assignmentId?: string | null;
};

export type LegacyBeneficiaryMergeRequest = {
  sourceEmail: string;
  targetEmail: string;
  expectedSourceRows: number;
  expectedSourceAssignments: number;
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function planLegacyBeneficiaryMerge<T extends MergeableLegacyBeneficiary>(
  rows: T[],
  request: LegacyBeneficiaryMergeRequest,
) {
  const sourceEmail = normalizeEmail(request.sourceEmail);
  const targetEmail = normalizeEmail(request.targetEmail);
  if (!sourceEmail || !targetEmail || sourceEmail === targetEmail) {
    throw new Error("Choose two different beneficiary email addresses");
  }
  if (!Number.isInteger(request.expectedSourceRows) || request.expectedSourceRows < 1) {
    throw new Error("Expected source row count is required");
  }
  if (!Number.isInteger(request.expectedSourceAssignments) || request.expectedSourceAssignments < 0) {
    throw new Error("Expected source assignment count is required");
  }

  const sourceRows = rows.filter((row) => normalizeEmail(row.email) === sourceEmail);
  const targetRows = rows.filter((row) => normalizeEmail(row.email) === targetEmail);
  if (sourceRows.length === 0) throw new Error("Source beneficiary was not found");
  if (targetRows.length === 0) throw new Error("Target beneficiary was not found");

  const sourceAssignmentIds = new Set(
    sourceRows.map((row) => row.assignmentId).filter((id): id is string => !!id),
  );
  if (
    sourceRows.length !== request.expectedSourceRows ||
    sourceAssignmentIds.size !== request.expectedSourceAssignments
  ) {
    throw new Error("Beneficiary assignments changed; reload and review before merging");
  }

  const targetAssignmentIds = new Set(
    targetRows.map((row) => row.assignmentId).filter((id): id is string => !!id),
  );
  const overlap = Array.from(sourceAssignmentIds).find((id) => targetAssignmentIds.has(id));
  if (overlap) {
    throw new Error("The two beneficiary records share a wallet assignment; merge aborted");
  }

  const targetName = normalizeName(targetRows[0].name);
  if (
    !targetName ||
    sourceRows.some((row) => normalizeName(row.name) !== targetName)
  ) {
    throw new Error("The records do not have the same beneficiary name; merge aborted");
  }

  const targetRelationship = (targetRows[0].relationship || "").trim().toLowerCase();
  if (
    sourceRows.some(
      (row) => (row.relationship || "").trim().toLowerCase() !== targetRelationship,
    )
  ) {
    throw new Error("The records do not have the same beneficiary relationship; merge aborted");
  }

  return {
    sourceEmail,
    targetEmail,
    sourceRowIds: sourceRows.map((row) => row.id),
    movedAssignments: sourceAssignmentIds.size,
    preservedRows: sourceRows.length,
  };
}