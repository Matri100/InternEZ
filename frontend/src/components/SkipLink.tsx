import { useI18n } from "../i18n";

// "Skip to content": the first thing Tab reaches, so keyboard and screen
// reader users can jump past the navigation. Focuses the page's
// <main id="main-content"> directly rather than following a #hash, which
// the router would treat as navigation.
export function SkipLink() {
  const { t } = useI18n();
  return (
    <a
      href="#main-content"
      className="skip-link"
      onClick={(e) => {
        e.preventDefault();
        document.getElementById("main-content")?.focus();
      }}
    >
      {t("a11y.skipToContent")}
    </a>
  );
}
