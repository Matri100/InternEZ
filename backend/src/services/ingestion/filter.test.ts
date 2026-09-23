import { describe, expect, it } from "vitest";
import { isInternshipTitle } from "./filter.js";

describe("isInternshipTitle", () => {
  it("matches clearly internship-shaped titles", () => {
    expect(isInternshipTitle("Software Engineering Intern")).toBe(true);
    expect(isInternshipTitle("Marketing Internship")).toBe(true);
    expect(isInternshipTitle("Working Student - Data Analytics")).toBe(true);
    expect(isInternshipTitle("Werkstudent Softwareentwicklung")).toBe(true);
    expect(isInternshipTitle("Praktikant Vertrieb")).toBe(true);
    expect(isInternshipTitle("Trainee Program - Finance")).toBe(true);
    expect(isInternshipTitle("Apprenticeship - Cloud Engineering")).toBe(true);
  });

  it("does not match on 'internal' as a substring of 'intern'", () => {
    expect(isInternshipTitle("Internal Audit Manager")).toBe(false);
    expect(isInternshipTitle("Senior Manager, Internal Controls")).toBe(false);
    expect(isInternshipTitle("Internal Tools Engineer")).toBe(false);
  });

  it("does not match ordinary full-time titles", () => {
    expect(isInternshipTitle("Software Engineer")).toBe(false);
    expect(isInternshipTitle("Product Manager")).toBe(false);
  });

  it("has a known, accepted false positive on 'Stage Manager' (French 'stage' = internship)", () => {
    expect(isInternshipTitle("Stage Manager")).toBe(true);
  });
});
