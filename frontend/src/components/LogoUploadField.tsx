import { useState } from "react";
import { CompanyLogo } from "./CompanyLogo";
import { readAsDataUrl } from "../lib/files";
import { UploadIcon } from "./icons";

const MAX_BYTES = 2 * 1024 * 1024;

interface Props {
  name: string;
  logoUrl: string | null;
  onChange: (url: string | null) => void;
}

export function LogoUploadField({ name, logoUrl, onChange }: Props) {
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | null) {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image is too large — max 2MB.");
      return;
    }
    const dataUrl = await readAsDataUrl(file);
    onChange(dataUrl);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <CompanyLogo name={name || "?"} logoUrl={logoUrl} size={56} />
      <div>
        <label className="file-input-label">
          <UploadIcon />
          Choose logo
          <input type="file" accept="image/*" onChange={(e) => handleFile(e.target.files?.[0] ?? null)} />
        </label>
        {logoUrl && (
          <button type="button" className="btn btn-ghost btn-sm" style={{ marginLeft: 8 }} onClick={() => onChange(null)}>
            Remove
          </button>
        )}
        {error && <p style={{ color: "var(--blocked)", fontSize: 12.5, marginTop: 6 }}>{error}</p>}
        <p className="field-hint" style={{ marginTop: 6 }}>Square image works best, up to 2MB.</p>
      </div>
    </div>
  );
}
