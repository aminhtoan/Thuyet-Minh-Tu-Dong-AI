/**
 * Gemini API Key Pool — round-robin rotation với auto-cooldown khi 429/401.
 *
 * Cấu hình qua .env:
 *   GEMINI_API_KEY=key1          ← key duy nhất (tương thích cũ)
 *   GEMINI_API_KEYS=key1,key2,key3  ← nhiều key, dấu phẩy phân cách
 *
 * Logic:
 *   - Xoay vòng round-robin theo lượt request.
 *   - Khi một key bị 429 → cooldown 60s trước khi dùng lại.
 *   - Khi một key bị 401 (invalid) → đánh dấu disabled vĩnh viễn trong session.
 *   - Nếu tất cả key đều đang cooldown → trả key ít bị block nhất (tránh lỗi ngay).
 */

interface KeyState {
  key: string;
  disabled: boolean;        // 401 invalid key → bỏ hẳn
  cooldownUntil: number;    // ms timestamp, 0 = không bị cooldown
  uses: number;             // số lần đã dùng
}

const QUOTA_COOLDOWN_MS = 60_000; // 60s cooldown khi 429

function parseKeys(): string[] {
  const multi = process.env.GEMINI_API_KEYS?.trim();
  if (multi) {
    const keys = multi.split(',').map(k => k.trim()).filter(Boolean);
    if (keys.length > 0) return keys;
  }
  const single = process.env.GEMINI_API_KEY?.trim();
  return single ? [single] : [];
}

class GeminiKeyPool {
  private states: KeyState[] = [];
  private cursor = 0;
  private initialized = false;

  private init() {
    if (this.initialized) return;
    this.initialized = true;
    const keys = parseKeys();
    this.states = keys.map(key => ({ key, disabled: false, cooldownUntil: 0, uses: 0 }));
  }

  /** Lấy key tiếp theo để dùng. Throw nếu không còn key hợp lệ. */
  pick(): string {
    this.init();
    if (!this.states.length) throw new Error('GEMINI_KEY_POOL_EMPTY: No Gemini API keys configured.');

    const now = Date.now();
    const available = this.states.filter(s => !s.disabled && s.cooldownUntil <= now);

    if (available.length === 0) {
      // Tất cả đang cooldown → chọn cái hết cooldown sớm nhất
      const fallback = this.states
        .filter(s => !s.disabled)
        .sort((a, b) => a.cooldownUntil - b.cooldownUntil)[0];
      if (!fallback) throw new Error('GEMINI_KEY_POOL_EMPTY: All Gemini API keys are disabled (invalid).');
      fallback.uses++;
      return fallback.key;
    }

    // Round-robin trong danh sách available
    const idx = this.cursor % available.length;
    this.cursor = (this.cursor + 1) % available.length;
    const chosen = available[idx]!;
    chosen.uses++;
    return chosen.key;
  }

  /** Báo cáo lỗi để pool xử lý cooldown/disable */
  report(key: string, httpStatus: number) {
    this.init();
    const state = this.states.find(s => s.key === key);
    if (!state) return;
    if (httpStatus === 429) {
      state.cooldownUntil = Date.now() + QUOTA_COOLDOWN_MS;
    } else if (httpStatus === 401) {
      state.disabled = true;
    }
  }

  /** Diagnostic: trả về snapshot trạng thái (không lộ key) */
  status() {
    this.init();
    const now = Date.now();
    return this.states.map((s, i) => ({
      index: i,
      disabled: s.disabled,
      onCooldown: !s.disabled && s.cooldownUntil > now,
      cooldownRemainingMs: s.cooldownUntil > now ? s.cooldownUntil - now : 0,
      uses: s.uses,
    }));
  }

  /** Số key đang hoạt động */
  get activeCount(): number {
    this.init();
    const now = Date.now();
    return this.states.filter(s => !s.disabled && s.cooldownUntil <= now).length;
  }

  get totalCount(): number {
    this.init();
    return this.states.length;
  }
}

export const geminiKeyPool = new GeminiKeyPool();
