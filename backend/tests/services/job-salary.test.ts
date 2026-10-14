import { parseSalary } from "../../src/services/job-discovery.service";
import { mapDiscoveryJobToListing } from "../../src/utils/jobListingMapper";

// Salary must be stored as an absolute annual amount, otherwise the CTC filter
// (which sends rupees, e.g. "3-6 LPA" -> 300000..600000) can never match.
describe("parseSalary", () => {
  it("scales lakh/lac/LPA strings to rupees", () => {
    expect(parseSalary("₹3-6 Lacs PA", "min")).toBe(300000);
    expect(parseSalary("₹3-6 Lacs PA", "max")).toBe(600000);
    expect(parseSalary("10-15 LPA", "min")).toBe(1000000);
    expect(parseSalary("0.4-0.7 LPA", "max")).toBe(70000);
  });

  it("scales crore strings", () => {
    expect(parseSalary("1.2 - 1.5 Cr", "min")).toBe(12000000);
  });

  it("annualises monthly and hourly amounts", () => {
    expect(parseSalary("₹30,000 - ₹50,000 per month", "min")).toBe(360000);
    expect(parseSalary("₹30,000 per month", "min")).toBe(360000);
    expect(parseSalary("$50 / hr", "min")).toBe(104000);
  });

  it("scales already-suffixed thousands notation", () => {
    expect(parseSalary("$130K - $175K", "min")).toBe(130000);
    expect(parseSalary("$130K - $175K", "max")).toBe(175000);
  });

  it("keeps already-absolute amounts unchanged", () => {
    expect(parseSalary("$120,000 - $180,000", "min")).toBe(120000);
    expect(parseSalary("₹18,00,000 PA", "min")).toBe(1800000);
  });

  it("returns undefined for missing or non-numeric input", () => {
    expect(parseSalary("", "min")).toBeUndefined();
    expect(parseSalary("Competitive", "min")).toBeUndefined();
  });
});

describe("mapDiscoveryJobToListing salary", () => {
  it("formats with the record's currency and no duplicate symbol", () => {
    const job = mapDiscoveryJobToListing({
      id: "1", title: "SDE", company: "Acme", salaryMin: 1800000, salaryMax: 3200000, salaryCurrency: "USD",
    });
    expect(job.salary).toBe("$18.0L - $32.0L PA");
  });

  it("renders lakh-scale and thousands-scale leftovers readably", () => {
    const j = (salaryMin: number, salaryMax: number) =>
      mapDiscoveryJobToListing({ id: "3", title: "SDE", company: "Acme", salaryMin, salaryMax, salaryCurrency: "INR" }).salary;
    expect(j(5, 15)).toBe("₹5L - ₹15L PA"); // legacy rows stored in lakhs
    expect(j(130, 175)).toBe("₹130K - ₹175K PA"); // legacy rows stored in thousands
    expect(j(62000, 72000)).toBe("₹62K - ₹72K PA"); // sub-lakh amounts
  });

  it("leaves salary empty when unknown so the UI hides the row", () => {
    const job = mapDiscoveryJobToListing({ id: "2", title: "SDE", company: "Acme" });
    expect(job.salary).toBe("");
  });
});
