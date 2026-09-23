import { describe, expect, it } from "vitest";
import { mapLocationToCountry } from "./mapCountry.js";

describe("mapLocationToCountry", () => {
  it("resolves a 'city, country' string", () => {
    expect(mapLocationToCountry("Berlin, Germany")).toBe("DE");
    expect(mapLocationToCountry("Madrid, Spain")).toBe("ES");
  });

  it("resolves a bare country name", () => {
    expect(mapLocationToCountry("Poland")).toBe("PL");
  });

  it("resolves a bare city name with no country given (the common real ATS case)", () => {
    // Found this gap live against a real N26 internship listing on
    // Greenhouse, whose location was just "Madrid" — no country at all.
    expect(mapLocationToCountry("Madrid")).toBe("ES");
    expect(mapLocationToCountry("Berlin")).toBe("DE");
    expect(mapLocationToCountry("Dublin")).toBe("IE");
  });

  it("resolves secondary French cities found live against real Doctolib listings", () => {
    expect(mapLocationToCountry("Nantes")).toBe("FR");
    expect(mapLocationToCountry("Strasbourg")).toBe("FR");
  });

  it("resolves a bare 2-letter code that's a valid CountryCode", () => {
    expect(mapLocationToCountry("DE")).toBe("DE");
  });

  it("resolves via known aliases", () => {
    expect(mapLocationToCountry("Prague, Czech Republic")).toBe("CZ");
    expect(mapLocationToCountry("Amsterdam, The Netherlands")).toBe("NL");
  });

  it("falls back to a substring scan when there's no clean separator", () => {
    expect(mapLocationToCountry("Remote Germany")).toBe("DE");
  });

  it("returns null for a non-EU/EEA location instead of guessing", () => {
    expect(mapLocationToCountry("San Francisco, CA")).toBeNull();
    expect(mapLocationToCountry("London, United Kingdom")).toBeNull();
    expect(mapLocationToCountry("GB")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(mapLocationToCountry("")).toBeNull();
  });
});
