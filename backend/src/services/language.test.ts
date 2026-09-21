import { describe, expect, it } from "vitest";
import { detectListingLanguage } from "./language.js";

describe("detectListingLanguage", () => {
  it("detects English text as English", () => {
    const result = detectListingLanguage(
      "Software Engineering Intern",
      "We are looking for a motivated student to join our backend team and help build scalable systems."
    );
    expect(result).toBe("English");
  });

  it("detects Polish text as Polish", () => {
    const result = detectListingLanguage(
      "Praktykant ds. Inzynierii Oprogramowania",
      "Poszukujemy zmotywowanego studenta do dolaczenia do naszego zespolu backendowego i pomocy w budowaniu skalowalnych systemow."
    );
    expect(result).toBe("Polish");
  });

  it("detects German text as German", () => {
    const result = detectListingLanguage(
      "Praktikant Softwareentwicklung",
      "Wir suchen einen motivierten Studenten, der unserem Backend-Team beitritt und uns beim Aufbau skalierbarer Systeme hilft."
    );
    expect(result).toBe("German");
  });

  it("falls back to English for text too short to call confidently", () => {
    expect(detectListingLanguage("Short", "Too short.")).toBe("English");
    expect(detectListingLanguage("", "")).toBe("English");
  });
});
