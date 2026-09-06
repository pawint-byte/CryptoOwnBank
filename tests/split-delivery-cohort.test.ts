import { describe, expect, it } from "vitest";
import { getSplitDeliveryCohort } from "../client/src/lib/split-delivery-cohort";

describe("split-delivery cohort", () => {
  const beneficiaries = [
    { id: "1", email: "kid1@example.test", splitPieces: "piece A", beneficiaryGroup: "kids" },
    { id: "2", email: " KID1@example.test ", splitPieces: "piece B", beneficiaryGroup: "kids" },
    { id: "3", email: "kid2@example.test", splitPieces: "piece C", beneficiaryGroup: "kids" },
    { id: "4", email: "kid3@example.test", splitPieces: "piece D", beneficiaryGroup: "kids" },
    { id: "5", email: "attorney@example.test", splitPieces: null, beneficiaryGroup: "advisors" },
  ];

  it("counts unique recipients with active split pieces instead of every row", () => {
    expect(getSplitDeliveryCohort(beneficiaries)).toHaveLength(3);
  });

  it("can limit the active cohort to a selected beneficiary group", () => {
    expect(getSplitDeliveryCohort(beneficiaries, "kids")).toHaveLength(3);
    expect(getSplitDeliveryCohort(beneficiaries, "advisors")).toHaveLength(0);
  });
});