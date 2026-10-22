export type CustomerAttempt = { status: 'NOT_SENT' | 'PROCESSING' | 'DRAFT_SAVED' | 'FAILED_PRE_DISPATCH' | 'FAILED_RESPONSE' | 'EXPIRED' | 'UNCERTAIN'; phase: string; diagnosticCode: string | null; providerHttpStatus?: number | null; updatedAt: string | null; canGenerate: false };
export function customerAttemptMessage(attempt: CustomerAttempt | null): string | null;
