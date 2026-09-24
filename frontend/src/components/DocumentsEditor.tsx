import { useRef, useState } from "react";
import type { DocumentFile, DocumentKind } from "../types/domain";
import { formatFileSize, readAsDataUrl } from "../lib/files";
import { UploadIcon } from "./icons";
import { useI18n } from "../i18n";

const MAX_BYTES = 6 * 1024 * 1024;

interface Props {
  value: DocumentFile[];
  kinds: DocumentKind[];
  onChange: (next: DocumentFile[]) => void;
}

export function DocumentsEditor({ value, kinds, onChange }: Props) {
  const [pendingKind, setPendingKind] = useState<DocumentKind>(kinds[0]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t, ref } = useI18n();

  async function handleFile(file: File | null) {
    if (!file) return;
    setError(null);
    if (file.size > MAX_BYTES) {
      setError(t("documents.tooLarge", { name: file.name }));
      return;
    }
    const dataUrl = await readAsDataUrl(file);
    const doc: DocumentFile = {
      id: `tmp_${Math.random().toString(36).slice(2)}`,
      applicantId: "",
      kind: pendingKind,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      dataUrl,
    };
    onChange([...value, doc]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(id: string) {
    onChange(value.filter((d) => d.id !== id));
  }

  return (
    <div>
      {value.length > 0 && (
        <div className="document-list">
          {value.map((doc) => (
            <div className="document-row" key={doc.id}>
              {doc.mimeType.startsWith("image/") ? (
                <img src={doc.dataUrl} alt="" className="document-thumb" />
              ) : (
                <div className="document-thumb document-thumb-generic">{doc.fileName.split(".").pop()?.toUpperCase()}</div>
              )}
              <div className="document-info">
                <span className="document-kind">{ref("documentKind", doc.kind)}</span>
                <span className="document-name">
                  {doc.fileName} ({formatFileSize(doc.size)})
                </span>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(doc.id)}>
                {t("entry.remove")}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="document-add-row">
        <select
          className="input"
          value={pendingKind}
          onChange={(e) => setPendingKind(e.target.value as DocumentKind)}
          style={{ maxWidth: 200 }}
        >
          {kinds.map((k) => (
            <option key={k} value={k}>
              {ref("documentKind", k)}
            </option>
          ))}
        </select>
        <label className="file-input-label">
          <UploadIcon />
          {t("documents.choose")}
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>
      {error && <p style={{ color: "var(--blocked)", fontSize: 12.5, marginTop: 6 }}>{error}</p>}
      <p className="field-hint" style={{ marginTop: 6 }}>
        {t("documents.hint")}
      </p>
    </div>
  );
}
