export type ProjectEditInput = { name: string; description: string; sourceLanguage: string };
export type ProjectEditValidation =
  | { valid: true; value: ProjectEditInput }
  | { valid: false; error: string };

export function validateProjectEdit(input: ProjectEditInput, supportedLanguages: readonly string[]): ProjectEditValidation;
export function runProjectSaveOnce<T>(lock: { current: boolean }, operation: () => Promise<T>): Promise<{ started: false } | { started: true; value: T }>;
export function mergeUpdatedProject<T extends { id: string }>(projects: readonly T[], updatedProject: T): T[];
