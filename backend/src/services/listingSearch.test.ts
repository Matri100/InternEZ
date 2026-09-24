import { describe, expect, it } from "vitest";
import { cityOf, effectiveDuration, PAGE_SIZE, searchListings, type ListingRow } from "./listingSearch.js";
import { parseSearchFilters } from "./savedSearch.js";
import type { Applicant, Company, ListingSearchQuery } from "../types/domain.js";

const applicant: Applicant = {
  id: "a1",
  name: "Test Applicant",
  email: "a@test.dev",
  phone: "",
  portfolioUrl: "",
  citizenship: "PL",
  secondCitizenship: null,
  placeOfBirth: null,
  residence: null,
  education: [],
  workExperience: [],
  projects: [],
  certifications: [],
  documents: [],
  availableFrom: "",
  preferredLength: null,
  workArrangementPreference: [],
  preferredLocations: [],
  languages: [],
  skills: [],
  interests: [],
  qualifications: [],
  summary: "",
  coverLetterPrompts: { whyThisField: "", provenStrength: "", workingStyle: "", careerGoals: "" },
  profileComplete: true,
  discoverable: false,
};

function company(name: string): Company {
  return { id: `c-${name}`, name, verified: false, logoUrl: null, description: "", website: "", headquarters: null, companySize: null };
}

function row(id: string, overrides: Partial<ListingRow> = {}, companyName = "Acme"): { listing: ListingRow; company: Company } {
  return {
    company: company(companyName),
    listing: {
      id,
      companyId: `c-${companyName}`,
      createdAt: "2026-09-01T00:00:00.000Z",
      title: "Intern",
      location: "Munich, Bavaria, Germany",
      country: "DE",
      origin: "sourced",
      department: "",
      workArrangement: "On-site",
      requiredEducationLevel: "Bachelor",
      duration: "Flexible",
      startDate: "flexible",
      startLabel: "",
      endLabel: "",
      compensation: "",
      applicationDeadline: "",
      language: "German",
      applyUrl: "https://example.com",
      requirements: [],
      skills: [],
      targetFields: [],
      requiredLanguages: [],
      industries: [],
      preferredQualifications: [],
      eligibility: {},
      extraQuestions: [],
      ...overrides,
    },
  };
}

function query(overrides: Partial<ListingSearchQuery> = {}): ListingSearchQuery {
  return { ...parseSearchFilters({}), directOnly: false, eligibleOnly: false, sort: "match", page: 1, ...overrides };
}

function search(rows: ReturnType<typeof row>[], overrides: Partial<ListingSearchQuery> = {}) {
  return searchListings({ rows, applicant, savedIds: new Set(["b"]), query: query(overrides) });
}

const rows = [
  row("a", { title: "Marketing Praktikum" }, "Bosch"),
  row("b", { location: "Berlin, Germany", language: "English", workArrangement: "Hybrid" }, "N26"),
  row("c", { location: "Paris, Ile-de-France, France", country: "FR", language: "French" }, "Airbus"),
  row("d", { location: "Lyon, France", country: "FR", language: "English", origin: "direct", duration: "6 months" }),
  row("e", { title: "Werkstudent München", location: "Germany", eligibility: { citizenOnly: "DE" } }),
];

describe("searchListings", () => {
  it("filters by several countries, cities and languages at once", () => {
    expect(search(rows, { countries: ["FR"] }).items.map((l) => l.id).sort()).toEqual(["c", "d"]);
    expect(search(rows, { cities: ["Munich", "Paris"] }).items.map((l) => l.id).sort()).toEqual(["a", "c"]);
    expect(search(rows, { languages: ["English"], countries: ["DE"] }).items.map((l) => l.id)).toEqual(["b"]);
  });

  it("counts each facet's options against every other filter but its own", () => {
    const { facets } = search(rows, { countries: ["FR"], languages: ["French"] });
    // Countries ignore the country filter itself, but respect "French".
    expect(facets.countries).toEqual([{ value: "FR", count: 1 }]);
    // Languages ignore the language filter, but respect "France".
    expect(facets.languages).toEqual([
      { value: "English", count: 1 },
      { value: "French", count: 1 },
    ]);
    expect(facets.cities).toEqual([{ value: "Paris", count: 1, country: "FR" }]);
  });

  it("keeps a selected option in its facet at 0 so it can be unselected", () => {
    const { facets } = search(rows, { countries: ["FR"], cities: ["Munich"] });
    expect(facets.cities.find((c) => c.value === "Munich")).toEqual({ value: "Munich", count: 0, country: "DE" });
  });

  it("searches title, company and location, ignoring case and accents", () => {
    expect(search(rows, { query: "munchen" }).items.map((l) => l.id)).toEqual(["e"]);
    expect(search(rows, { query: "bosch marketing" }).items.map((l) => l.id)).toEqual(["a"]);
    expect(search(rows, { query: "airbus paris" }).items.map((l) => l.id)).toEqual(["c"]);
  });

  it("treats a sourced listing's placeholder duration as unknown", () => {
    const { facets, items } = search(rows, { durations: ["Flexible"] });
    expect(items).toEqual([]);
    expect(facets.durations).toEqual([
      { value: "6 months", count: 1 },
      { value: "Flexible", count: 0 },
    ]);
  });

  it("applies the direct-only and eligible-only toggles, and counts them", () => {
    const all = search(rows);
    expect(all.facets.direct).toBe(1);
    expect(all.facets.eligible).toBe(4); // "e" is for German citizens only; the applicant is Polish
    expect(search(rows, { directOnly: true }).items.map((l) => l.id)).toEqual(["d"]);
    expect(search(rows, { eligibleOnly: true }).items.map((l) => l.id)).not.toContain("e");
  });

  it("sorts by deadline with undated listings last, and by company name", () => {
    const dated = [row("x", { applicationDeadline: "2026-12-01" }), row("y"), row("z", { applicationDeadline: "2026-10-01" })];
    expect(search(dated, { sort: "deadline" }).items.map((l) => l.id)).toEqual(["z", "x", "y"]);
    expect(search(rows, { sort: "company" }).items.map((l) => l.company.name)).toEqual([
      "Acme",
      "Acme",
      "Airbus",
      "Bosch",
      "N26",
    ]);
  });

  it("pages results and clamps an out-of-range page", () => {
    const many = Array.from({ length: PAGE_SIZE + 5 }, (_, i) => row(`r${i}`));
    const second = search(many, { page: 2 });
    expect(second.total).toBe(PAGE_SIZE + 5);
    expect(second.items).toHaveLength(5);
    expect(search(many, { page: 99 }).page).toBe(2);
  });

  it("marks saved listings and leaves descriptions out", () => {
    const item = search(rows).items.find((l) => l.id === "b")!;
    expect(item.saved).toBe(true);
    expect("description" in item).toBe(false);
  });
});

describe("cityOf", () => {
  it("takes the part before the first comma, and nothing for a bare country", () => {
    expect(cityOf({ location: "Munich, Bavaria, Germany" })).toBe("Munich");
    expect(cityOf({ location: "Germany" })).toBeNull();
  });
});

describe("effectiveDuration", () => {
  it("is null only for a sourced listing's placeholder", () => {
    expect(effectiveDuration({ origin: "sourced", duration: "Flexible" })).toBeNull();
    expect(effectiveDuration({ origin: "direct", duration: "Flexible" })).toBe("Flexible");
    expect(effectiveDuration({ origin: "sourced", duration: "6 months" })).toBe("6 months");
  });
});

describe("parseSearchFilters", () => {
  it("upgrades a saved search stored with the old single country", () => {
    const legacy = { query: "", workArrangements: [], durations: [], fieldOfStudy: "", country: "DE" };
    expect(parseSearchFilters(legacy).countries).toEqual(["DE"]);
  });

  it("drops unknown countries, arrangements and durations", () => {
    const parsed = parseSearchFilters({ countries: ["DE", "US"], workArrangements: ["Hybrid", "Moon"], durations: ["2 years"] });
    expect(parsed.countries).toEqual(["DE"]);
    expect(parsed.workArrangements).toEqual(["Hybrid"]);
    expect(parsed.durations).toEqual([]);
  });
});
