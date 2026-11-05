export interface SettingsGroup { id: string; title: string; fields: { label: string; value: string }[] }
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const sensitive = /[a-z][a-z\d+.-]*:\/\/|\bBearer\s|\beyJ[\w-]*\.[\w-]+\.[\w-]+|\bsk-[\w-]+|\bAIza[\w-]+|-----BEGIN|(?:api[_ -]?key|password|secret|token|connection[_ -]?string)\s*[:=]/i;

/** Never dump response objects: only known display fields are selected. */
export function formatSettingValue(value: unknown, kind: 'text' | 'configured' | 'size' | 'list' = 'text'): string {
  if (value === null || value === undefined) return 'Không có dữ liệu';
  if (typeof value === 'string' && sensitive.test(value)) return 'Đã ẩn thông tin nhạy cảm';
  if (kind === 'list') {
    if (!Array.isArray(value)) return 'Dữ liệu không đúng định dạng';
    if (!value.length) return 'Danh sách rỗng';
    return value.map(item => formatSettingValue(item)).join(' · ');
  }
  if (typeof value === 'boolean') return kind === 'configured' ? value ? 'Đã cấu hình' : 'Chưa cấu hình' : value ? 'Có (true)' : 'Không (false)';
  if (typeof value === 'number' && Number.isFinite(value)) return `${value}${kind === 'size' ? ' MB' : ''}`;
  if (typeof value === 'string') return value === '' ? 'Chuỗi rỗng ("")' : value;
  return 'Dữ liệu không đúng định dạng';
}

export function settingsGroups(value: unknown): SettingsGroup[] {
  const data = record(value), upload = record(data.upload), auth = record(data.authentication), processing = record(data.processing);
  const known = ['environment', 'upload', 'authentication', 'processing'];
  if (!known.some(key => Object.hasOwn(data, key))) return [];
  return [
    { id: 'environment', title: 'Môi trường', fields: [{ label: 'Môi trường thực thi (Environment)', value: formatSettingValue(data.environment) }] },
    { id: 'upload', title: 'Tải tệp', fields: [
      { label: 'Dung lượng tối đa', value: formatSettingValue(upload.maxSizeMb, 'size') },
      { label: 'Định dạng MIME hỗ trợ', value: formatSettingValue(upload.supportedMediaTypes, 'list') },
    ] },
    { id: 'authentication', title: 'Xác thực', fields: [
      { label: 'Thời hạn access token (TTL)', value: formatSettingValue(auth.accessTokenTtl) },
      { label: 'Thời hạn refresh token (TTL)', value: formatSettingValue(auth.refreshTokenTtl) },
    ] },
    { id: 'processing', title: 'Xử lý phương tiện và AI', fields: [
      { label: 'Chế độ xử lý', value: formatSettingValue(processing.mode) },
      { label: 'Nguồn executable FFmpeg', value: formatSettingValue(processing.ffmpegBinarySource) },
      { label: 'Nguồn executable FFprobe', value: formatSettingValue(processing.ffprobeBinarySource) },
      { label: 'Nhà cung cấp tạo bản ghi (STT)', value: formatSettingValue(processing.sttProviderConfigured, 'configured') },
      { label: 'Nhà cung cấp dịch thuật', value: formatSettingValue(processing.translationProviderConfigured, 'configured') },
      { label: 'Nhà cung cấp giọng đọc (TTS)', value: formatSettingValue(processing.ttsProviderConfigured, 'configured') },
    ] },
  ];
}
