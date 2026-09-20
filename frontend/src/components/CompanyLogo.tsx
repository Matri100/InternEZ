function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function CompanyLogo({
  name,
  logoUrl,
  size = 40,
}: {
  name: string;
  logoUrl?: string | null;
  size?: number;
}) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${name} logo`}
        className="company-logo"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="company-logo company-logo-placeholder"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
      }}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
