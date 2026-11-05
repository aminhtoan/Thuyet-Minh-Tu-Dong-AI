import { AdminDialog } from '../common/AdminDialog';
import { Button } from '../common/Button';
import type { AdminCustomer } from '../../types/customer';
export function ConfirmStatusDialog({ customer, pending, onCancel, onConfirm }: { customer: AdminCustomer | null; pending: boolean; onCancel: () => void; onConfirm: () => void }) {
  const blocking = customer?.status === 'ACTIVE';
  return <AdminDialog open={Boolean(customer)} onClose={onCancel} busy={pending} labelledBy="status-dialog-title" describedBy="status-dialog-description">
    {customer && <><div className={'confirm-dialog__icon ' + (blocking ? 'confirm-dialog__icon--danger' : '')}><span aria-hidden="true"><span className="sr-only">Thay đổi trạng thái</span></span></div>
      <h2 id="status-dialog-title">{blocking ? 'Khóa tài khoản người dùng?' : 'Mở khóa tài khoản?'}</h2>
      <p id="status-dialog-description">{blocking ? `Tài khoản “${customer.fullName}” sẽ bị khóa và các refresh session hiện có sẽ bị thu hồi.` : `Tài khoản “${customer.fullName}” sẽ được mở khóa.`}</p>
      <div className="confirm-dialog__actions"><Button autoFocus variant="secondary" onClick={onCancel} disabled={pending}>Hủy</Button><Button variant={blocking ? 'danger' : 'primary'} onClick={onConfirm} disabled={pending}>{pending ? 'Đang cập nhật...' : blocking ? 'Khóa tài khoản' : 'Mở khóa'}</Button></div></>}
  </AdminDialog>;
}
