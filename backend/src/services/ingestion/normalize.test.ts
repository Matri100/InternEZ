import { describe, expect, it } from "vitest";
import { normalizeActiveJob, type NormalizedJob } from "./normalize.js";
import type { ActiveJobsDbJob } from "./activeJobsDb.js";

// Trimmed from a real Active Jobs DB record (Pandora, Italy) captured on
// 2026-09-24 — field shapes and value formats are exactly as the API
// returned them.
function pandoraJob(overrides: Partial<ActiveJobsDbJob> = {}): ActiveJobsDbJob {
  return {
    id: 2380009549,
    title: "Sales Associate Intern",
    organization: "Pandora",
    organization_url: "https://www.pandora.net/",
    organization_logo: "https://d1wao037kgukun.cloudfront.net/oms/2855/logo.png",
    domain_derived: "pandoragroup.com",
    url: "https://careers.pandoragroup.com/sales-associate-intern/job/P22-358757-0",
    date_posted: "2026-09-24T07:54:30.920249Z",
    date_valid_through: null,
    locations_derived: ["Cuneo, Piedmont, Italy"],
    description_html:
      '<p class="ql-align-center"><strong>STAGE/TIROCINIO ADDETTA/O VENDITA 30H</strong>&nbsp;</p><p>Cerchiamo persone entusiaste e proattive con un forte desiderio di imparare.</p><ul><li>Accoglienza clienti</li><li>Gestione del negozio</li></ul>',
    ai_employment_type: ["INTERN", "PART_TIME"],
    ai_work_arrangement: "On-site",
    ai_education: null,
    ai_key_skills: ["Customer engagement", "Teamwork"],
    ai_taxonomies_a: ["Retail", "Sales"],
    ai_salary_currency: "EUR",
    ai_salary_value: 650,
    ai_salary_min_value: null,
    ai_salary_max_value: null,
    ai_salary_unit_text: "MONTH",
    ...overrides,
  };
}

function normalized(job: ActiveJobsDbJob, now = new Date("2026-09-24T12:00:00Z")): NormalizedJob {
  const result = normalizeActiveJob(job, "IT", now);
  if ("skipped" in result) throw new Error(`unexpectedly skipped: ${result.skipped}`);
  return result;
}

describe("normalizeActiveJob", () => {
  it("maps a real record into a sourced listing with a stable id", () => {
    const { listingId, companyId, listing } = normalized(pandoraJob());
    expect(listingId).toBe("ajdb:2380009549");
    expect(companyId).toBe("ajdb:pandoragroup.com");
    expect(listing.origin).toBe("sourced");
    expect(listing.country).toBe("IT");
    expect(listing.location).toBe("Cuneo, Piedmont, Italy");
    expect(listing.applyUrl).toBe("https://careers.pandoragroup.com/sales-associate-intern/job/P22-358757-0");
    expect(listing.workArrangement).toBe("On-site");
  });

  it("keeps the description's structure (heading, paragraph, list)", () => {
    const { listing } = normalized(pandoraJob());
    expect(listing.description).toBe(
      "**STAGE/TIROCINIO ADDETTA/O VENDITA 30H**\n\n" +
        "Cerchiamo persone entusiaste e proattive con un forte desiderio di imparare.\n\n" +
        "- Accoglienza clienti\n- Gestione del negozio"
    );
    expect(listing.language).toBe("Italian");
  });

  it("decodes entities in one-line fields", () => {
    const job = pandoraJob({ title: "Stagiaire Contr&#xf4;le de Gestion", organization: "Proc&amp;#xe9;d&#xe9;s SA" });
    const { listing, company } = normalized(job);
    expect(listing.title).toBe("Stagiaire Contrôle de Gestion");
    expect(company.name).toBe("Procédés SA");
  });

  it("leaves the start date empty instead of claiming it's flexible", () => {
    expect(normalized(pandoraJob()).listing.startLabel).toBe("");
  });

  it("formats compensation from the salary fields", () => {
    expect(normalized(pandoraJob()).listing.compensation).toBe("650 EUR / month");
    const range = pandoraJob({ ai_salary_value: null, ai_salary_min_value: 1200, ai_salary_max_value: 1500 });
    expect(normalized(range).listing.compensation).toBe("1,200–1,500 EUR / month");
    expect(normalized(pandoraJob({ ai_salary_currency: null })).listing.compensation).toBe("");
  });

  it("uses the lowest education level mentioned, defaulting to Bachelor", () => {
    expect(normalized(pandoraJob()).listing.requiredEducationLevel).toBe("Bachelor");
    expect(normalized(pandoraJob({ ai_education: ["high school"] })).listing.requiredEducationLevel).toBe(
      "High School"
    );
    expect(
      normalized(pandoraJob({ ai_education: ["master degree", "bachelor degree"] })).listing.requiredEducationLevel
    ).toBe("Bachelor");
  });

  it("maps skills and industries onto the app's own vocabulary where the names match", () => {
    const job = pandoraJob({ ai_key_skills: ["python", "Data analysis", "Customer engagement", "Python"] });
    expect(normalized(job).listing.skills).toEqual(["Python", "Data Analysis", "Customer engagement"]);
    const industries = pandoraJob({ ai_taxonomies_a: ["Logistics", "Retail"] });
    expect(normalized(industries).listing.industries).toEqual(["Logistics"]);
  });

  it("expires 45 days after posting when the source gives no end date", () => {
    expect(normalized(pandoraJob()).expiresAt).toBe("2026-11-08T07:54:30.920Z");
    const withEnd = normalized(pandoraJob({ date_valid_through: "2026-10-15T00:00:00Z" }));
    expect(withEnd.expiresAt).toBe("2026-10-15T00:00:00.000Z");
    expect(withEnd.listing.applicationDeadline).toBe("2026-10-15");
  });

  it("uses the employer's own logo, falling back to a favicon of its domain", () => {
    expect(normalized(pandoraJob()).company.logoUrl).toBe("https://d1wao037kgukun.cloudfront.net/oms/2855/logo.png");
    expect(normalized(pandoraJob({ organization_logo: null })).company.logoUrl).toBe(
      "https://www.google.com/s2/favicons?domain=pandoragroup.com&sz=128"
    );
  });

  it("never treats an ATS host as the employer's identity", () => {
    const job = pandoraJob({ domain_derived: "jobs.smartrecruiters.com", organization: "Brembo N.V.", organization_logo: null });
    const { companyId, company } = normalized(job);
    expect(companyId).toBe("ajdb:brembo-n-v");
    expect(company.website).toBe("");
    expect(company.logoUrl).toBeNull();
  });

  it("picks the location that's actually in the synced country from a multi-city posting", () => {
    const job = pandoraJob({ locations_derived: ["Munich, Bavaria, Germany", "Milan, Lombardy, Italy"] });
    expect(normalized(job).listing.location).toBe("Milan, Lombardy, Italy");
  });

  it("skips records that aren't internships, aren't in the country, or have no employer", () => {
    const now = new Date("2026-09-24T12:00:00Z");
    const notIntern = pandoraJob({ title: "Internal Audit Manager", ai_employment_type: ["FULL_TIME"] });
    expect(normalizeActiveJob(notIntern, "IT", now)).toEqual({ skipped: "notInternship" });
    const elsewhere = pandoraJob({ locations_derived: ["Vienna, Austria"] });
    expect(normalizeActiveJob(elsewhere, "IT", now)).toEqual({ skipped: "wrongCountry" });
    expect(normalizeActiveJob(pandoraJob({ organization: " " }), "IT", now)).toEqual({ skipped: "noEmployer" });
  });

  it("accepts an internship the feed classifies as INTERN even if the title uses other wording", () => {
    const job = pandoraJob({ title: "Junior Sales Associate (6 months)", ai_employment_type: ["INTERN"] });
    expect("skipped" in normalizeActiveJob(job, "IT")).toBe(false);
  });
});
