import { describe, expect, it } from "vitest";
import { planLegacyBeneficiaryMerge } from "../server/lib/legacy-beneficiary-merge";

describe("Legacy beneficiary merge planning", () => {
  const rows = [
    { id: "target", name: "Victoria H. Wint", email: "vickybow88@gmail.com", relationship: "child", assignmentId: "wallet-target" },
    { id: "old-root", name: "Victoria H. Wint", email: "mvp.vicky88@gmail.com", relationship: "child", assignmentId: null },
    { id: "old-wallet-1", name: "Victoria H. Wint", email: "MVP.VICKY88@gmail.com", relationship: "child", assignmentId: "wallet-1" },
    { id: "old-wallet-2", name: "Victoria H. Wint", email: "mvp.vicky88@gmail.com", relationship: "child", assignmentId: "wallet-2" },
  ];

  it("preserves every source row while moving distinct wallet assignments", () => {
    const result = planLegacyBeneficiaryMerge(rows, {
      sourceEmail: "mvp.vicky88@gmail.com",
      targetEmail: "vickybow88@gmail.com",
      expectedSourceRows: 3,
      expectedSourceAssignments: 2,
    });

    expect(result.sourceRowIds).toEqual(["old-root", "old-wallet-1", "old-wallet-2"]);
    expect(result.movedAssignments).toBe(2);
    expect(result.preservedRows).toBe(3);
  });

  it("aborts if the records share a wallet assignment", () => {
    expect(() => planLegacyBeneficiaryMerge(
      [...rows, { ...rows[1], id: "old-overlap", assignmentId: "wallet-target" }],
      {
        sourceEmail: "mvp.vicky88@gmail.com",
        targetEmail: "vickybow88@gmail.com",
        expectedSourceRows: 4,
        expectedSourceAssignments: 3,
      },
    )).toThrow("share a wallet assignment");
  });

  it("aborts when expected counts are stale", () => {
    expect(() => planLegacyBeneficiaryMerge(rows, {
      sourceEmail: "mvp.vicky88@gmail.com",
      targetEmail: "vickybow88@gmail.com",
      expectedSourceRows: 2,
      expectedSourceAssignments: 2,
    })).toThrow("changed");
  });
});