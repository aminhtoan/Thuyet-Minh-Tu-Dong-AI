import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { Icon } from '../components/common/Icon'
import { Card } from '../components/common/Card'
import { Input } from '../components/common/Input'
import { Spinner } from '../components/common/Spinner'
import { formatFileSize, MAX_MEDIA_FILE_SIZE, validateMediaFile, validateProjectName, type UploadStatus } from '../features/projects/mediaUpload'
import { uploadProjectMedia } from '../features/projects/uploadService'
import { manualSourceOptions } from '../features/projects/sourceLanguage'
import type { LanguageCode, SourceLanguageMode } from '../features/projects/types'
import '../styles/upload.css'

export function NewProjectPlaceholder() {
  const [projectName, setProjectName] = useState('')
  const [description, setDescription] = useState('')
  const [nameTouched, setNameTouched] = useState(false)
  const [sourceLanguageMode, setSourceLanguageMode] = useState<SourceLanguageMode>('AUTO')
  const [sourceLanguage, setSourceLanguage] = useState<LanguageCode>('vi')
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [, setProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const controllerRef = useRef<AbortController | null>(null)
  const previewUrlRef = useRef<string | null>(null)
  const dragDepth = useRef(0)
  const validation = validateMediaFile(file && { name: file.name, size: file.size, mimeType: file.type })
  const nameError = validateProjectName(projectName)
  const busy = status === 'validating' || status === 'uploading'
  const canUpload = !nameError && (sourceLanguageMode === 'AUTO' || Boolean(sourceLanguage)) && validation.valid && !busy && status !== 'success'

  useEffect(() => () => {
    controllerRef.current?.abort()
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
  }, [])

  function selectFile(nextFile: File | null) {
    if (!nextFile || busy) return
    controllerRef.current?.abort()
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    const nextValidation = validateMediaFile({ name: nextFile.name, size: nextFile.size, mimeType: nextFile.type })
    previewUrlRef.current = nextValidation.valid ? URL.createObjectURL(nextFile) : null
    setPreviewUrl(previewUrlRef.current)
    setFile(nextFile)
    setStatus('selected')
    setProgress(0)
    setUploadError(null)
  }
  function removeFile() {
    if (busy) return
    controllerRef.current?.abort()
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = null
    setPreviewUrl(null)
    setFile(null)
    setStatus('idle')
    setProgress(0)
    setUploadError(null)
    if (inputRef.current) inputRef.current.value = ''
  }
  function onBrowseChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0] ?? null)
    event.target.value = ''
  }
  function onDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    if (busy) return
    dragDepth.current += 1
    setDragOver(true)
  }
  function onDragOver(event: DragEvent<HTMLDivElement>) { event.preventDefault(); event.dataTransfer.dropEffect = busy ? 'none' : 'copy' }
  function onDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dragDepth.current = Math.max(0, dragDepth.current - 1)
    if (dragDepth.current === 0) setDragOver(false)
  }
  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dragDepth.current = 0
    setDragOver(false)
    selectFile(event.dataTransfer.files?.[0] ?? null)
  }
  async function startUpload() {
    setNameTouched(true)
    const result = validateMediaFile(file && { name: file.name, size: file.size, mimeType: file.type })
    if (nameError || !sourceLanguage || !result.valid || !file || busy) return
    setStatus('validating')
    setUploadError(null)
    setProgress(0)
    const controller = new AbortController()
    controllerRef.current = controller
    try {
      setStatus('uploading')
      await uploadProjectMedia({ projectName: projectName.trim(), description: description.trim(), sourceLanguageMode, ...(sourceLanguageMode === 'MANUAL' ? { sourceLanguage } : {}), file, signal: controller.signal, onProgress: setProgress })
      if (!controller.signal.aborted) setStatus('success')
    } catch (error) {
      if (controller.signal.aborted) setStatus('cancelled')
      else { setStatus('failed'); setUploadError(error instanceof Error ? error.message : 'Tải lên thất bại. Vui lòng thử lại.') }
    } finally { if (controllerRef.current === controller) controllerRef.current = null }
  }
  function cancelUpload() { controllerRef.current?.abort(); setStatus('cancelled') }

  return <div className="upload-page" aria-busy={busy}>
    <div className="upload-layout" aria-label="Biểu mẫu tạo dự án mới">
      <Card padding="lg" className="upload-form-card">
        <div className="upload-section-heading"><span className="upload-step">1</span><div><h2>Thông tin dự án</h2><p>Đặt tên dự án và chọn ngôn ngữ được sử dụng trong phương tiện gốc.</p></div></div>
        <div className="upload-fields">
          <Input label="Tên dự án" required maxLength={100} placeholder="Ví dụ: Giới thiệu sản phẩm" value={projectName} onChange={(event) => setProjectName(event.target.value)} onBlur={() => setNameTouched(true)} error={nameTouched ? nameError ?? undefined : undefined} helperText="Từ 3 đến 100 ký tự. Dấu * là trường bắt buộc." disabled={busy || status === 'success'} />
          <div className="field"><label className="field__label" htmlFor="source-language-mode">Ngôn ngữ nguồn</label><select id="source-language-mode" className="upload-select" value={sourceLanguageMode} onChange={event => setSourceLanguageMode(event.target.value as SourceLanguageMode)} disabled={busy || status === 'success'} aria-describedby="source-mode-help"><option value="AUTO">Tự động nhận diện (AUTO)</option><option value="MANUAL">Chọn thủ công (MANUAL)</option></select><p id="source-mode-help" className="field__message">{sourceLanguageMode === 'AUTO' ? 'Sau khi tạo bản ghi, bạn cần xác nhận ngôn ngữ chính nếu hệ thống chưa xác định được.' : 'Chọn ngôn ngữ được sử dụng trong phương tiện gốc.'}</p></div>
          {sourceLanguageMode === 'MANUAL' && <div className="field"><label className="field__label" htmlFor="source-language">Chọn ngôn ngữ nguồn</label><select id="source-language" className="upload-select" value={sourceLanguage} onChange={event => setSourceLanguage(event.target.value)} disabled={busy || status === 'success'} required>{manualSourceOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>}
          <div className="field upload-field--full"><label className="field__label" htmlFor="project-description">Mô tả</label><textarea id="project-description" className="upload-description" maxLength={1000} placeholder="Mô tả ngắn về nội dung dự án" value={description} onChange={(event) => setDescription(event.target.value)} disabled={busy || status === 'success'} /><span className="field__message">Không bắt buộc · {description.length}/1000 ký tự</span></div>
        </div>
      </Card>
      <Card padding="lg" className="upload-form-card">
        <div className="upload-section-heading"><span className="upload-step">2</span><div><h2 id="upload-media-heading">Tệp phương tiện</h2><p id="upload-media-guidance">Tải lên video hoặc âm thanh của bạn. Hỗ trợ nhiều định dạng phổ biến.</p></div></div>
        <input ref={inputRef} id="media-file" className="visually-hidden" type="file" accept=".mp4,.mov,.webm,.mp3,.wav,.m4a,video/mp4,video/quicktime,video/webm,audio/mpeg,audio/wav,audio/mp4" onChange={onBrowseChange} disabled={busy || status === 'success'} aria-label="Chọn tệp video hoặc âm thanh" aria-invalid={Boolean(file && !validation.valid)} aria-describedby={file && !validation.valid ? 'upload-media-guidance upload-file-formats upload-file-error' : 'upload-media-guidance upload-file-formats'} />
        {!file ? <div className={`upload-dropzone${dragOver ? ' upload-dropzone--active' : ''}`} role="group" aria-labelledby="upload-media-heading" aria-describedby="upload-file-formats" onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
          <div className="upload-dropzone__symbol" aria-hidden="true"><Icon name="arrow" width="32" /></div><div className="upload-dropzone__copy"><strong>Kéo thả video hoặc âm thanh vào đây</strong><span>hoặc chọn tệp từ máy tính</span></div><Button type="button" disabled={busy || status === 'success'} onClick={() => inputRef.current?.click()}>Chọn tệp</Button>
        </div> : <div className={`upload-file${validation.valid ? '' : ' upload-file--invalid'}`}>
          <div className="upload-file__head"><span className="upload-file__type">{validation.valid ? validation.mediaType === 'VIDEO' ? 'Video' : 'Âm thanh' : 'Tệp không hợp lệ'}</span><div className="upload-file__actions"><Button type="button" size="sm" variant="secondary" disabled={busy || status === 'success'} onClick={() => inputRef.current?.click()}>Thay đổi</Button><Button type="button" size="sm" variant="ghost" disabled={busy || status === 'success'} onClick={removeFile}>Xóa</Button></div></div>
          <strong className="upload-file__name">{file.name}</strong><span className="upload-file__size">{formatFileSize(file.size)} · {validation.valid ? 'Tệp hợp lệ' : 'Tệp không hợp lệ'}</span>
          {validation.valid && previewUrl && (validation.mediaType === 'VIDEO' ? <video className="upload-preview" src={previewUrl} controls preload="metadata" aria-label="Xem trước video đã chọn" /> : <audio className="upload-preview" src={previewUrl} controls preload="metadata" aria-label="Nghe thử âm thanh đã chọn" />)}
        </div>}
        <small id="upload-file-formats">Hỗ trợ: MP4, MOV, WEBM, MP3, WAV, M4A · Dung lượng tối đa: {formatFileSize(MAX_MEDIA_FILE_SIZE)}</small>
        {file && !validation.valid && <p id="upload-file-error" className="upload-error" role="alert">{validation.error}</p>}
      </Card>
      <Card padding="lg" className="upload-form-card upload-action-card">
        <div className="upload-section-heading"><span className="upload-step">3</span><div><h2>Hoàn tất</h2><p>Dự án và tệp phương tiện sẽ được lưu trên máy chủ.</p></div></div>
        {status === 'uploading' && <div className="upload-feedback" role="status"><Spinner label="Đang tải phương tiện lên máy chủ" /><p>Vui lòng giữ trang này mở cho đến khi hoàn tất.</p><Button type="button" variant="secondary" onClick={cancelUpload}>Hủy tải lên</Button></div>}
        {status === 'cancelled' && <div className="upload-feedback" role="status"><strong>Đã hủy tải lên</strong><p>Tệp vẫn đang được chọn. Bạn có thể thử lại khi sẵn sàng.</p><div className="upload-actions"><Button type="button" onClick={startUpload}>Thử lại</Button><Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>Chọn tệp khác</Button></div></div>}
        {status === 'failed' && <div className="upload-feedback" role="alert"><strong>Tải lên thất bại</strong><p>{uploadError ?? 'Không thể tải tệp phương tiện lên.'}</p><div className="upload-actions"><Button type="button" onClick={startUpload}>Thử lại</Button><Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>Chọn tệp khác</Button></div></div>}
        {status === 'success' && <div className="upload-feedback upload-feedback--success" role="status"><strong>Tải lên hoàn tất</strong><p>Dự án và tệp phương tiện đã được lưu. Mở dự án vừa tạo trong danh sách để tiếp tục đến bước Bản ghi.</p><Link className="button button--primary button--md" to="/projects">Mở danh sách dự án</Link></div>}
        {(status === 'idle' || status === 'selected') && <div className="upload-primary-actions"><Link className="button button--secondary button--lg" to="/projects">Quay lại danh sách</Link><Button type="button" size="lg" disabled={!canUpload} onClick={startUpload}>Tạo dự án<Icon name="arrow" width="18" /></Button></div>}
        {status === 'validating' && <div className="upload-primary-actions"><Button type="button" size="lg" loading disabled>Đang kiểm tra...</Button></div>}
      </Card>
    </div>
  </div>
}
