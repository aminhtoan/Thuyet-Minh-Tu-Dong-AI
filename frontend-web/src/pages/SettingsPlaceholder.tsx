import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { createNameSaver, validateDisplayName } from '../features/auth/profileUpdate.mjs';
import { Card } from '../components/common/Card';
import { ErrorState } from '../components/common/ErrorState';
import { Spinner } from '../components/common/Spinner';
import { getProfileIdentity } from '../features/auth/profileIdentity.mjs';
import { authService } from '../features/auth/authService';
import '../styles/account.css';

type User = { id: string; fullName: string; email: string; role: string };
export function AccountProfile({ user, onUpdated }: { user: User; onUpdated?: (user: User) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(user.fullName);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saver = useRef(createNameSaver(authService.updateName));
  const savingLock = useRef(false);
  async function save(event: FormEvent) {
    event.preventDefault();
    if (savingLock.current) return;
    const validation = validateDisplayName(draft);
    if (validation) { setSaveError(validation); return; }
    savingLock.current = true;
    setSaving(true); setSaveError(null);
    try {
      const updated = await saver.current(draft);
      if (updated) { onUpdated?.(updated); setEditing(false); }
    } catch (reason) {
      setSaveError(reason instanceof Error && reason.name === 'TimeoutError' ? 'Yêu cầu hết thời gian chờ. Vui lòng thử lại.' : reason instanceof Error && reason.name !== 'TypeError' ? reason.message : 'Không thể kết nối máy chủ. Vui lòng thử lại.');
    } finally { savingLock.current = false; setSaving(false); }
  }
  const identity = getProfileIdentity(user);
  const roleLabel = user.role === 'CUSTOMER' ? 'Khách hàng' : user.role === 'ADMIN' ? 'Quản trị viên' : 'Không xác định';
  return <section className="account-profile" aria-labelledby="account-profile-title">
    <div className="account-profile__summary">
      <span className="account-profile__avatar" aria-hidden="true">{identity.initial}</span>
      <div className="account-profile__identity">
      <h2 id="account-profile-title">{identity.name}</h2>
      <p className="account-profile__email">{identity.email || 'Chưa có thông tin email'}</p>
      <span className="account-profile__role">{roleLabel}</span>
      </div>
      {onUpdated && <Button className="account-profile__edit-button" type="button" variant="secondary" disabled={editing || saving} onClick={() => { setDraft(user.fullName); setEditing(true); setSaveError(null); }}>Chỉnh sửa</Button>}
    </div>
    <div className="account-profile__content">
      <h3>Thông tin cá nhân</h3>
      <dl className="account-profile__details">
        <div className="account-profile__name-field"><dt>Họ và tên</dt><dd>{editing ? <form onSubmit={(event) => void save(event)} aria-busy={saving}>
          <Input label="Họ và tên mới" helperText="Nhập từ 2 đến 100 ký tự." autoComplete="name" autoFocus value={draft} maxLength={100} required disabled={saving} error={saveError ?? undefined} onBlur={() => setSaveError(validateDisplayName(draft))} onChange={(event) => { setDraft(event.target.value); setSaveError(null); }} />
          <div className="account-profile__edit-actions"><Button type="submit" loading={saving} disabled={Boolean(validateDisplayName(draft))}>Lưu thay đổi</Button><Button type="button" variant="secondary" disabled={saving} onClick={() => { setEditing(false); setDraft(user.fullName); setSaveError(null); }}>Hủy</Button></div>
        </form> : identity.name}</dd></div>
        <div><dt>Email</dt><dd>{identity.email || 'Chưa có thông tin email'}</dd></div>
      </dl>
      {saveError && <p role="alert" className="field__message field__message--error">{saveError}</p>}
    </div>
  </section>;
}
export function SettingsPlaceholder() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  useEffect(() => { let active = true; void authService.me().then((data) => { if (active) setUser(data.user); }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Không thể tải tài khoản.'); }); return () => { active = false; }; }, [loadAttempt]);
  function retryLoad() { setError(null); setUser(null); setLoadAttempt((attempt) => attempt + 1); }
  return <div className="account-page">{error ? <Card padding="lg"><ErrorState title="Không thể tải tài khoản" description={error} onRetry={retryLoad} /></Card> : !user ? <Card padding="lg"><Spinner label="Đang tải tài khoản" /></Card> : <AccountProfile user={user} onUpdated={setUser} />}</div>;
}
