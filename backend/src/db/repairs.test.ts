import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "../models/store.js";
import { repairSourcedListingText } from "./repairs.js";

// Runs against the real test Postgres (see vitest.globalSetup.ts), which is
// the point: the row filter is a Postgres regex, not JavaScript.

async function sourcedListing(fields: { companyName: string; title: string; description: string }) {
  const companyId = `ajdb:${randomUUID()}`;
  const listingId = `ajdb:${randomUUID()}`;
  await db.saveCompany(companyId, {
    name: fields.companyName,
    verified: false,
    logoUrl: null,
    description: "",
    website: "",
    headquarters: null,
    companySize: null,
  });
  await db.upsertSourcedListing(
    listingId,
    companyId,
    {
      title: fields.title,
      location: "Paris, France",
      country: "FR",
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
      description: fields.description,
      language: "French",
      applyUrl: "https://example.com/job",
      requirements: [],
      skills: [],
      targetFields: [],
      requiredLanguages: [],
      industries: [],
      preferredQualifications: [],
      eligibility: {},
      extraQuestions: [],
    },
    "2099-01-01T00:00:00.000Z"
  );
  return { companyId, listingId };
}

describe("repairSourcedListingText", () => {
  it("decodes entities left in stored listings and company names", async () => {
    const { companyId, listingId } = await sourcedListing({
      companyName: "Proc&#xe9;d&#xe9;s SA",
      title: "Stagiaire Contr&#xf4;le de Gestion",
      description: "**Contact**\n\nStefan&#xa0;Wolf (Functional Department)\n• Exp&#xe9;rience",
    });

    await repairSourcedListingText();

    const listing = await db.getListing(listingId);
    expect(listing?.title).toBe("Stagiaire Contrôle de Gestion");
    expect(listing?.description).toBe("**Contact**\n\nStefan Wolf (Functional Department)\n- Expérience");
    expect((await db.getCompany(companyId))?.name).toBe("Procédés SA");
  });

  it("removes leaked CSS and LinkedIn tags even when there's no entity to trigger it", async () => {
    const { listingId } = await sourcedListing({
      companyName: "Suez",
      title: "Stage Technicien",
      description: "#careerSite h2{\ncolor: #030F40;\n}\n\n\n\nType de contrat\n\nInternship\n\n#LI-Hybrid",
    });

    await repairSourcedListingText();

    expect((await db.getListing(listingId))?.description).toBe("Type de contrat\n\nInternship");
  });

  it("leaves clean text, including a bare ampersand, untouched", async () => {
    const { listingId } = await sourcedListing({
      companyName: "AT&T",
      title: "R&D Intern",
      description: "Join our R&D team.",
    });

    await repairSourcedListingText();

    const listing = await db.getListing(listingId);
    expect(listing?.title).toBe("R&D Intern");
    expect(listing?.description).toBe("Join our R&D team.");
  });
});
