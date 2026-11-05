import { useEffect, useRef, useState } from 'react'
import { Button } from '../../components/common/Button'
import { ApiError } from '../../lib/api'
import { manualSourceOptions, sourceState } from '../projects/sourceLanguage'
import { sourceLanguageService } from '../projects/sourceLanguageService'
import { projectRepository } from '../projects/projectRepository'
import type { Project } from '../projects/types'
import { transcriptService } from './transcriptService'
import type { Transcript } from './types'
import '../../styles/source-language.css'

type Props = { project: Project; transcript: Transcript; disabled?: boolean; onConfirmed: (transcript: Transcript) => void; onProjectReload: () => void | Promise<void> }
export function SourceLanguageConfirmation({ project, transcript, disabled, onConfirmed, onProjectReload }: Props) {
  const [language, setLanguage] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [reloadRequired, setReloadRequired] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const lock = useRef(false)
  const controller = useRef<AbortController | null>(null)
  useEffect(() => () => controller.current?.abort(), [])
  const source = sourceState(project)
  const revision = transcript.revision
  const eligible = (source.status === 'NEEDS_CONFIRMATION' || transcript.sourceLanguageStatus === 'NEEDS_CONFIRMATION')
    && source.mode === 'AUTO' && Number.isSafeInteger(revision) && revision !== null && revision > 0 && Boolean(transcript.fullText.trim())

  async function refresh(signal: AbortSignal) {
    const [freshProject, freshTranscript] = await Promise.all([
      projectRepository.getProject(project.id), transcriptService.getTranscript(project.id, { signal }),
    ])
    if (signal.aborted) return
    if (!freshTranscript) throw new Error('Không tải được bản ghi mới. Hãy tải lại dữ liệu.')
    onConfirmed(freshTranscript)
    await onProjectReload()
    if (signal.aborted) return
    if (sourceState(freshProject).confirmed && freshTranscript.languageCode === freshProject.sourceLanguage) {
      setMessage('Đã xác nhận ngôn ngữ nguồn và tải lại dữ liệu.')
      setAccepted(true)
    } else {
      setAccepted(false)
      setMessage('Đã tải lại dữ liệu. Hãy kiểm tra bản ghi và chọn ngôn ngữ nguồn để xác nhận.')
    }
    setReloadRequired(false)
  }

  async function confirm() {
    if (lock.current || !eligible || !language || disabled || reloadRequired || accepted || revision === null) return
    lock.current = true; setBusy(true); setMessage(null)
    const active = new AbortController(); controller.current = active
    let written = false
    try {
      await sourceLanguageService.confirm(project.id, language, revision, active.signal)
      written = true
      await refresh(active.signal)
    } catch (error) {
      if (active.signal.aborted) return
      const conflict = error instanceof ApiError && ['SOURCE_LANGUAGE_REVISION_CONFLICT', 'TRANSCRIPT_REVISION_UNAVAILABLE'].includes(error.code)
      const messages: Record<string, string> = {
        SOURCE_LANGUAGE_HAS_DEPENDENTS: 'Dự án đã có bản dịch, artifact hoặc lần dịch phụ thuộc. Không thể đổi nguồn trực tiếp.',
        SOURCE_LANGUAGE_BUSY: 'Dự án đang xử lý. Hãy chờ hoàn tất rồi tải lại dữ liệu.',
        SOURCE_LANGUAGE_REVISION_REQUIRED: 'Nguồn đã được xác định. Việc đổi nguồn cần workflow revision riêng.',
      }
      setMessage(written ? 'Máy chủ đã nhận xác nhận nhưng chưa tải lại đủ dữ liệu. Chỉ tải lại dữ liệu, không gửi xác nhận lần nữa.'
        : conflict ? 'Bản ghi hoặc nguồn đã thay đổi. Hãy tải lại dữ liệu và kiểm tra trước khi xác nhận; hệ thống không tự gửi lại.'
          : error instanceof ApiError ? messages[error.code] ?? error.message : error instanceof Error ? error.message : 'Không thể xác nhận ngôn ngữ nguồn.')
      setReloadRequired(true)
    } finally {
      lock.current = false
      if (!active.signal.aborted) setBusy(false)
    }
  }

  async function reload() {
    if (lock.current) return
    lock.current = true; setBusy(true)
    const active = new AbortController(); controller.current = active
    try { await refresh(active.signal) }
    catch { if (!active.signal.aborted) setMessage('Không tải lại được dữ liệu. Chưa thể xác nhận hoặc dịch; vui lòng thử tải lại.') }
    finally { lock.current = false; if (!active.signal.aborted) setBusy(false) }
  }

  return <section className="source-confirmation" aria-labelledby="source-confirmation-heading" aria-busy={busy}>
    <h2 id="source-confirmation-heading">Xác nhận ngôn ngữ nguồn</h2>
    <p>Đọc các phân đoạn bên dưới và chọn ngôn ngữ chính của lời nói. Nếu video xen nhiều ngôn ngữ, hãy chọn ngôn ngữ chính theo nội dung thực tế.</p>
    <div className="source-confirmation__controls"><div className="field"><label htmlFor="confirmed-source-language">Ngôn ngữ chính trong bản ghi</label>
      <select id="confirmed-source-language" value={language} onChange={event => setLanguage(event.target.value)} disabled={busy || disabled || reloadRequired || accepted} aria-describedby="source-confirmation-help">
        <option value="">Chọn sau khi kiểm tra bản ghi</option>{manualSourceOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select></div>
      <Button type="button" loading={busy} disabled={disabled || !eligible || !language || busy || reloadRequired || accepted} onClick={() => void confirm()}>Xác nhận nguồn</Button>
      {reloadRequired && <Button type="button" variant="secondary" disabled={busy} onClick={() => void reload()}>Tải lại dữ liệu</Button>}
    </div>
    <p id="source-confirmation-help">{!eligible ? 'Cần tải bản ghi hợp lệ với revision hiện tại trước khi xác nhận.' : 'Chỉ lưu lựa chọn nguồn; thao tác này không chạy dịch hoặc tạo âm thanh.'}</p>
    {message && <p role={reloadRequired ? 'alert' : 'status'}>{message}</p>}
  </section>
}
