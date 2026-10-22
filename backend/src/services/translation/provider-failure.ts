import { AppError } from '../../utils/app-error.js';

export const PROVIDER_ERROR_STATUSES = ['UNSPECIFIED', 'INVALID_ARGUMENT', 'FAILED_PRECONDITION', 'OUT_OF_RANGE', 'PERMISSION_DENIED', 'UNAUTHENTICATED', 'RESOURCE_EXHAUSTED'] as const;
export const PROVIDER_ERROR_REASONS = ['API_KEY_INVALID', 'API_KEY_EXPIRED', 'API_KEY_SERVICE_BLOCKED', 'SERVICE_DISABLED', 'BILLING_DISABLED', 'BILLING_NOT_ACTIVE', 'MODEL_NOT_FOUND', 'LOCATION_POLICY_VIOLATED', 'ACCESS_TOKEN_SCOPE_INSUFFICIENT', 'CREDENTIALS_MISSING', 'QUOTA_EXCEEDED', 'RATE_LIMIT_EXCEEDED'] as const;
export const PROVIDER_ERROR_PARAMETERS = ['generationConfig.responseJsonSchema', 'generationConfig.responseSchema', 'generationConfig.responseMimeType', 'generationConfig.responseFormat', 'generationConfig.thinkingConfig.thinkingLevel', 'generationConfig.thinkingConfig.thinkingBudget', 'generationConfig.maxOutputTokens', 'generationConfig.candidateCount', 'contents', 'systemInstruction', 'model'] as const;
export type ProviderDiagnostic = Readonly<{ status: typeof PROVIDER_ERROR_STATUSES[number]; reasons: readonly typeof PROVIDER_ERROR_REASONS[number][]; parameters: readonly typeof PROVIDER_ERROR_PARAMETERS[number][] }>;
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const member = <T extends string>(values: readonly T[], value: unknown): value is T => typeof value === 'string' && (values as readonly string[]).includes(value);

// SDK ApiError.message contains JSON response text. Parse it transiently within a
// strict byte bound, then retain ONLY static enum values and parameter roots.
// Never retain message, field descriptions, metadata, arbitrary paths or bodies.
export function gemini400Diagnostic(error: unknown, httpStatus?: number): ProviderDiagnostic | undefined {
  if (httpStatus !== 400) return undefined;
  const empty = (): ProviderDiagnostic => Object.freeze({ status: 'UNSPECIFIED', reasons: Object.freeze([]), parameters: Object.freeze([]) });
  const message = record(error).message;
  if (typeof message !== 'string' || Buffer.byteLength(message) > 16384) return empty();
  let body: Record<string, unknown>;
  try { body = record(record(JSON.parse(message)).error); } catch { return empty(); }
  if (body.code !== undefined && body.code !== 400) return empty();
  const status = member(PROVIDER_ERROR_STATUSES, body.status) ? body.status : 'UNSPECIFIED';
  const reasons = new Set<typeof PROVIDER_ERROR_REASONS[number]>();
  const parameters = new Set<typeof PROVIDER_ERROR_PARAMETERS[number]>();
  for (const item of (Array.isArray(body.details) ? body.details.slice(0, 8) : [])) {
    const detail = record(item);
    if (detail['@type'] === 'type.googleapis.com/google.rpc.ErrorInfo' && member(PROVIDER_ERROR_REASONS, detail.reason)) reasons.add(detail.reason);
    if (detail['@type'] !== 'type.googleapis.com/google.rpc.BadRequest') continue;
    for (const violation of (Array.isArray(detail.fieldViolations) ? detail.fieldViolations.slice(0, 16) : [])) {
      const field = record(violation).field;
      if (typeof field !== 'string' || field.length > 512) continue;
      const normalized = field.replaceAll('_', '').toLowerCase();
      for (const root of PROVIDER_ERROR_PARAMETERS) {
        const prefix = root.toLowerCase();
        if (normalized === prefix || normalized.startsWith(prefix + '.') || normalized.startsWith(prefix + '[')) { parameters.add(root); break; }
      }
    }
  }
  return Object.freeze({ status, reasons: Object.freeze([...reasons].slice(0, 4)), parameters: Object.freeze([...parameters].slice(0, 8)) });
}

// Deliberately excludes SDK Error.message/body/headers: those may contain user
// content or credentials. Preserve only the numeric HTTP evidence we used to drop.
export class TranslationProviderFailure extends AppError {
  readonly providerHttpStatus: number | null;
  constructor(status: number, code: string, message: string, providerHttpStatus?: number, public readonly providerDiagnostic?: ProviderDiagnostic) {
    super(status, code, message);
    this.providerHttpStatus = Number.isInteger(providerHttpStatus) && providerHttpStatus! >= 400 && providerHttpStatus! <= 599 ? providerHttpStatus! : null;
  }
}
export function providerFailureMessage(status?: number | null, diagnostic?: ProviderDiagnostic): string | undefined {
  if (status === 400) {
    const billing = diagnostic?.status === 'FAILED_PRECONDITION' || diagnostic?.reasons.some(reason => reason === 'BILLING_DISABLED' || reason === 'BILLING_NOT_ACTIVE');
    return 'Gemini từ chối yêu cầu (HTTP 400). ' + (billing ? 'Cần kiểm tra điều kiện API, khu vực và billing của dự án Google AI Studio.' : 'Cần kiểm tra tham số request, API version, quyền API và billing trong Google AI Studio; chưa xác định nguyên nhân cụ thể.') + ' Giữ nguyên lần gửi này; không tự gửi lại hoặc chuyển model.';
  }
  if (status === 503) return 'Gemini tạm thời không khả dụng (HTTP 503). Hãy kiểm tra trạng thái dịch vụ và liên hệ hỗ trợ kiểm tra lần gửi này. Không tự gửi lại hoặc chuyển model.';
}
export function providerFailureReason(status: number | null) {
  switch (status) {
    case 400: return 'PROVIDER_REQUEST_REJECTED';
    case 401: return 'PROVIDER_AUTH_REJECTED';
    case 402: return 'PROVIDER_PAYMENT_REQUIRED';
    case 403: return 'PROVIDER_ACCESS_REJECTED';
    case 404: return 'PROVIDER_MODEL_NOT_FOUND';
    case 408: case 504: return 'PROVIDER_HTTP_TIMEOUT';
    case 429: return 'PROVIDER_QUOTA_REJECTED';
    case 500: return 'PROVIDER_INTERNAL_ERROR';
    case 502: case 503: return 'PROVIDER_UNAVAILABLE';
    default: return status ? 'PROVIDER_HTTP_ERROR' : 'PROVIDER_RECEIPT_UNKNOWN';
  }
}
