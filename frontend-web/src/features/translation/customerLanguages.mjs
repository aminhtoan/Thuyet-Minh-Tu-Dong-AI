// No hardcoded language list — all languages from the backend catalog are accepted.
// The catalog is the single source of truth; language codes that reach here have
// already been validated by translationTargetChoices (removes source language).

/** Short display label for inline references (e.g. error messages). Falls back to code. */
export function customerTargetLabel(target) {
  try {
    const dn = new Intl.DisplayNames(['vi'], { type: 'language', fallback: 'none' }).of(target);
    if (dn) return dn.charAt(0).toLowerCase() + dn.slice(1);
  } catch { /* ignore */ }
  return target;
}

/** Pass through all choices — the backend catalog already filters by isActive. */
export function customerTargetChoices(languages, _source) {
  // source is already excluded by translationTargetChoices upstream
  return languages;
}
