export type FileValidationResult = {
  ok: boolean;
  errors: string[];
};

// Build an accept attribute string like ".pdf,.docx"
export function buildAcceptAttr(types?: string[]): string | undefined {
  if (!types || types.length === 0) return undefined;
  const cleaned = types
    .map((t) => (t || '').toLowerCase().trim())
    .filter(Boolean)
    .map((t) => (t.startsWith('.') ? t : `.${t}`));
  return cleaned.join(',');
}

// Validate selected files against conference constraints
export function validateFiles(
  files: File[] | FileList,
  maxFileSizeMB?: number | null,
  allowedFileTypes?: string[] | null
): FileValidationResult {
  const list: File[] = Array.isArray(files) ? files : Array.from(files);
  const errors: string[] = [];
  const maxBytes = maxFileSizeMB ? maxFileSizeMB * 1024 * 1024 : undefined;
  const allowed = (allowedFileTypes || [])
    .map((t) => (t || '').toLowerCase().replace(/^[.]/, ''))
    .filter(Boolean);

  for (const f of list) {
    if (maxBytes != null && f.size > maxBytes) {
      errors.push(`${f.name}: exceeds ${maxFileSizeMB} MB`);
    }
    if (allowed.length > 0) {
      const ext = f.name.split('.').pop()?.toLowerCase();
      if (!ext || !allowed.includes(ext)) {
        errors.push(`${f.name}: type .${ext || 'unknown'} not allowed (${allowed.join(', ')})`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}
