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

  it("matches the internship vocabulary of each synced country (real titles from the feed)", () => {
    expect(isInternshipTitle("Stage - Business Analyst /Tests - Services Publics - Toulouse")).toBe(true);
    expect(isInternshipTitle("Stagiaire - Expertise comptable – Lille")).toBe(true);
    expect(isInternshipTitle("Stage Area Logistica - Lavorazioni Meccaniche")).toBe(true);
    expect(isInternshipTitle("Tirocinio Addetto Vendita")).toBe(true);
    expect(isInternshipTitle("Becario/a Marketing Digital")).toBe(true);
    expect(isInternshipTitle("Prácticas en Recursos Humanos")).toBe(true);
    expect(isInternshipTitle("Stagiair Finance")).toBe(true);
  });

  it("matches German compounds and Polish inflections, which have no word boundary", () => {
    expect(isInternshipTitle("Pflichtpraktikum im Vertrieb")).toBe(true);
    expect(isInternshipTitle("Werkstudent*in Office Management (m/w/d)")).toBe(true);
    expect(isInternshipTitle("IT-Werkstudentenjob Support")).toBe(true);
    expect(isInternshipTitle("Program praktyk letnich")).toBe(true);
    // "ż" is a non-ASCII letter: a plain \b boundary silently fails right after it.
    expect(isInternshipTitle("Staż w dziale IT")).toBe(true);
  });

  it("has a known, accepted false positive on 'Stage Manager' (French 'stage' = internship)", () => {
    expect(isInternshipTitle("Stage Manager")).toBe(true);
  });
});
