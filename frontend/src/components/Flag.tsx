import { useId } from "react";
import type { FlagCode } from "../i18n/locales";

// Drawn flags for the language menu. Flag emoji aren't an option: Windows
// has no flag emoji and shows the letters ("DE") instead. Each flag fills
// the same 4:3 box (sliced, not stretched) so the menu lines up; Spain's
// is the plain civil flag, since the coat of arms is unreadable at this
// size.
function FlagArt({ code, id }: { code: FlagCode; id: string }) {
  switch (code) {
    case "gb":
      return (
        <svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice">
          <clipPath id={`${id}-t`}>
            <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
          </clipPath>
          <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
          <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
          <path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${id}-t)`} stroke="#C8102E" strokeWidth="4" />
          <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
          <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
        </svg>
      );
    case "de":
      return (
        <svg viewBox="0 0 5 3" preserveAspectRatio="xMidYMid slice">
          <rect width="5" height="1" y="0" fill="#000" />
          <rect width="5" height="1" y="1" fill="#DD0000" />
          <rect width="5" height="1" y="2" fill="#FFCE00" />
        </svg>
      );
    case "fr":
      return (
        <svg viewBox="0 0 3 2" preserveAspectRatio="xMidYMid slice">
          <rect width="1" height="2" x="0" fill="#0055A4" />
          <rect width="1" height="2" x="1" fill="#fff" />
          <rect width="1" height="2" x="2" fill="#EF4135" />
        </svg>
      );
    case "it":
      return (
        <svg viewBox="0 0 3 2" preserveAspectRatio="xMidYMid slice">
          <rect width="1" height="2" x="0" fill="#009246" />
          <rect width="1" height="2" x="1" fill="#fff" />
          <rect width="1" height="2" x="2" fill="#CE2B37" />
        </svg>
      );
    case "nl":
      return (
        <svg viewBox="0 0 9 6" preserveAspectRatio="xMidYMid slice">
          <rect width="9" height="2" y="0" fill="#AE1C28" />
          <rect width="9" height="2" y="2" fill="#fff" />
          <rect width="9" height="2" y="4" fill="#21468B" />
        </svg>
      );
    case "es":
      return (
        <svg viewBox="0 0 3 2" preserveAspectRatio="xMidYMid slice">
          <rect width="3" height="2" fill="#AA151B" />
          <rect width="3" height="1" y="0.5" fill="#F1BF00" />
        </svg>
      );
    case "pl":
      return (
        <svg viewBox="0 0 8 5" preserveAspectRatio="xMidYMid slice">
          <rect width="8" height="2.5" y="0" fill="#fff" />
          <rect width="8" height="2.5" y="2.5" fill="#DC143C" />
        </svg>
      );
  }
}

export function Flag({ code }: { code: FlagCode }) {
  // Unique per instance: the UK flag's clip path is referenced by id, and
  // the menu shows the same flag twice (the button and its option).
  const id = useId().replace(/:/g, "");
  return (
    <span className="flag" aria-hidden="true">
      <FlagArt code={code} id={id} />
    </span>
  );
}
