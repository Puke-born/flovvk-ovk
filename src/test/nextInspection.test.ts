import { describe, it, expect } from "vitest";
import { calculateNextInspectionDate } from "@/lib/utils";

describe("calculateNextInspectionDate", () => {
  it("första besiktning: räknar från besiktningsdatum", () => {
    expect(
      calculateNextInspectionDate({
        inspectionDate: "2026-09-11",
        previousDate: "2020-01-01",
        intervalYears: 6,
        isFirstInspection: true,
      }),
    ).toBe("2032-09-11");
  });

  it("saknat föregående datum: räknar från besiktningsdatum", () => {
    expect(
      calculateNextInspectionDate({ inspectionDate: "2026-09-11", intervalYears: 3 }),
    ).toBe("2029-09-11");
  });

  it("i tid: räknar från besiktningsdatum", () => {
    expect(
      calculateNextInspectionDate({
        inspectionDate: "2026-05-01",
        previousDate: "2020-06-01",
        intervalYears: 6,
      }),
    ).toBe("2032-05-01");
  });

  it("för tidigt: räknar från besiktningsdatum", () => {
    expect(
      calculateNextInspectionDate({
        inspectionDate: "2024-05-01",
        previousDate: "2020-06-01",
        intervalYears: 6,
      }),
    ).toBe("2030-05-01");
  });

  it("försenad ett intervall: behåller cykeln", () => {
    expect(
      calculateNextInspectionDate({
        inspectionDate: "2027-01-15",
        previousDate: "2020-06-01",
        intervalYears: 6,
      }),
    ).toBe("2032-06-01");
  });

  it("försenad flera intervall: behåller cykeln", () => {
    expect(
      calculateNextInspectionDate({
        inspectionDate: "2026-09-11",
        previousDate: "2011-03-10",
        intervalYears: 3,
      }),
    ).toBe("2029-03-10");
  });

  it("skottdag hanteras", () => {
    expect(
      calculateNextInspectionDate({ inspectionDate: "2024-02-29", intervalYears: 3 }),
    ).toBe("2027-02-28");
  });
});
