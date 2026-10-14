type CatalogLanguage = { code: string; name: string; nativeName: string };
export function translationTargetChoices(languages: readonly CatalogLanguage[], sourceLanguage: string): CatalogLanguage[];
export function translationLanguageLabel(language: CatalogLanguage): string;
