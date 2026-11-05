export const customerTranslationTargets: readonly string[];
export function customerTargetLabel(target: string): string;
export function customerTargetChoices<T extends { code: string }>(languages: readonly T[], source: string): T[];
