import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { Icon } from '../components/common/Icon'
import { Card } from '../components/common/Card'
import { Input } from '../components/common/Input'
import { Spinner } from '../components/common/Spinner'
import { formatFileSize, MAX_MEDIA_FILE_SIZE, validateMediaFile, validateProjectName, type UploadStatus } from '../features/projects/mediaUpload'
import { uploadProjectMedia } from '../features/projects/uploadService'
import { sourceLanguageOptions } from '../features/projects/projectUtils'
import type { LanguageCode } from '../features/projects/types'
import '../styles/upload.css'

export function NewProjectPlaceholder() {
  const [projectName, setProjectName] = useState('')
  const [description, setDescription] = useState('')
  const [nameTouched, setNameTouched] = useState(false)
  const [languageTouched, setLanguageTouched] = useState(false)
  const [sourceLanguage, setSourceLanguage] = useState<LanguageCode | ''>('')
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
  const canUpload = !nameError && sourceLanguage && validation.valid && !busy && status !== 'success'

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
    setLanguageTouched(true)
    const result = validateMediaFile(file && { name: file.name, size: file.size, mimeType: file.type })
    if (nameError || !sourceLanguage || !result.valid || !file || busy) return
    setStatus('validating')
    setUploadError(null)
    setProgress(0)
    const controller = new AbortController()
    controllerRef.current = controller
    try {
      setStatus('uploading')
      await uploadProjectMedia({ projectName: projectName.trim(), description: description.trim(), sourceLanguage, file, signal: controller.signal, onProgress: setProgress })
      if (!controller.signal.aborted) setStatus('success')
    } catch (error) {
      if (controller.signal.aborted) setStatus('cancelled')
      else { setStatus('failed'); setUploadError(error instanceof Error ? error.message : 'Tải lên thất bại. Vui lòng thử lại.') }
    } finally { if (controllerRef.current === controller) controllerRef.current = null }
  }
  function cancelUpload() { controllerRef.current?.abort(); setStatus('cancelled') }

  return <>
    <div className="upload-layout">
      <Card padding="lg" className="upload-form-card">
        <div className="upload-section-heading"><span className="upload-step">1</span><div><h2>Chi tiết dự án</h2><p>Đặt tên dự án và chọn ngôn ngữ được sử dụng trong phương tiện gốc.</p></div></div>
        <div className="upload-fields">
          <Input label="Tên dự án" required maxLength={100} placeholder="Ví dụ: Giới thiệu sản phẩm" value={projectName} onChange={(event) => setProjectName(event.target.value)} onBlur={() => setNameTouched(true)} error={nameTouched ? nameError ?? undefined : undefined} helperText="Có ít nhất 3 ký tự." disabled={busy || status === 'success'} />
          <div className="field"><label className="field__label" htmlFor="project-description">Mô tả</label><textarea id="project-description" className="upload-description" maxLength={1000} placeholder="Mô tả ngắn về nội dung dự án" value={description} onChange={(event) => setDescription(event.target.value)} disabled={busy || status === 'success'} /><span className="field__message">Không bắt buộc · {description.length}/1000 ký tự</span></div>
          <div className="field upload-field--full"><label className="field__label" htmlFor="source-language">Ngôn ngữ nguồn <span className="field__required" aria-hidden="true">*</span></label><select id="source-language" className="upload-select" value={sourceLanguage} onBlur={() => setLanguageTouched(true)} onChange={(event) => setSourceLanguage(event.target.value as LanguageCode | '')} disabled={busy || status === 'success'} required aria-invalid={languageTouched && !sourceLanguage} aria-describedby="source-language-message"><option value="">Chọn ngôn ngữ</option>{sourceLanguageOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><p id="source-language-message" className={languageTouched && !sourceLanguage ? 'field__message field__message--error' : 'field__message'}>{languageTouched && !sourceLanguage ? 'Vui lòng chọn ngôn ngữ nguồn.' : 'Ngôn ngữ được sử dụng trong phương tiện gốc.'}</p></div>
        </div>
      </Card>
      <Card padding="lg" className="upload-form-card">
        <div className="upload-section-heading"><span className="upload-step">2</span><div><h2>Tệp phương tiện</h2><p>Tải lên video hoặc âm thanh của bạn. Hỗ trợ nhiều định dạng phổ biến.</p></div></div>
        <input ref={inputRef} id="media-file" className="visually-hidden" type="file" accept=".mp4,.mov,.webm,.mp3,.wav,.m4a,video/mp4,video/quicktime,video/webm,audio/mpeg,audio/wav,audio/mp4" onChange={onBrowseChange} disabled={busy || status === 'success'} aria-label="Chọn tệp video hoặc âm thanh" />
        {!file ? <div className={`upload-dropzone${dragOver ? ' upload-dropzone--active' : ''}`} onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
          <div className="upload-dropzone__symbol" aria-hidden="true"><Icon name="arrow" width="32" /></div><strong>Kéo thả video hoặc âm thanh vào đây</strong><span>hoặc chọn tệp từ máy tính</span><Button type="button" disabled={busy || status === 'success'} onClick={() => inputRef.current?.click()}>Chọn tệp</Button><small>Hỗ trợ: MP4, MOV, WEBM, MP3, WAV, M4A · Dung lượng tối đa: {formatFileSize(MAX_MEDIA_FILE_SIZE)}</small>
        </div> : <div className={`upload-file${validation.valid ? '' : ' upload-file--invalid'}`}>
          <div className="upload-file__head"><span className="upload-file__type">{validation.valid ? validation.mediaType === 'VIDEO' ? 'Video' : 'Âm thanh' : 'Tệp không hợp lệ'}</span><div className="upload-file__actions"><Button type="button" size="sm" variant="secondary" disabled={busy || status === 'success'} onClick={() => inputRef.current?.click()}>Thay đổi</Button><Button type="button" size="sm" variant="ghost" disabled={busy || status === 'success'} onClick={removeFile}>Xóa</Button></div></div>
          <strong className="upload-file__name">{file.name}</strong><span className="upload-file__size">{formatFileSize(file.size)} · {validation.valid ? 'Tệp hợp lệ' : 'Tệp không hợp lệ'}</span>
          {validation.valid && previewUrl && (validation.mediaType === 'VIDEO' ? <video className="upload-preview" src={previewUrl} controls preload="metadata" aria-label="Xem trước video đã chọn" /> : <audio className="upload-preview" src={previewUrl} controls preload="metadata" aria-label="Nghe thử âm thanh đã chọn" />)}
        </div>}
        {!file && <div className="upload-file upload-file--empty"><strong>Chưa có tệp nào được chọn</strong><span>Hãy chọn hoặc kéo thả tệp phương tiện để tiếp tục.</span></div>}
        {file && !validation.valid && <p className="upload-error" role="alert">{validation.error}</p>}
      </Card>
      <Card padding="lg" className="upload-form-card upload-action-card">
        <div className="upload-section-heading"><span className="upload-step">3</span><div><h2>Tải lên</h2><p>Dự án và tệp phương tiện sẽ được lưu trên máy chủ.</p></div></div>
        {status === 'uploading' && <div className="upload-feedback" role="status"><Spinner label="Đang tải phương tiện lên máy chủ" /><p>Vui lòng giữ trang này mở cho đến khi hoàn tất.</p><Button type="button" variant="secondary" onClick={cancelUpload}>Hủy tải lên</Button></div>}
        {status === 'cancelled' && <div className="upload-feedback" role="status"><strong>Đã hủy tải lên</strong><p>Tệp vẫn đang được chọn. Bạn có thể thử lại khi sẵn sàng.</p><div className="upload-actions"><Button type="button" onClick={startUpload}>Thử lại</Button><Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>Chọn tệp khác</Button></div></div>}
        {status === 'failed' && <div className="upload-feedback" role="alert"><strong>Tải lên thất bại</strong><p>{uploadError ?? 'Không thể tải tệp phương tiện lên.'}</p><div className="upload-actions"><Button type="button" onClick={startUpload}>Thử lại</Button><Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>Chọn tệp khác</Button></div></div>}
        {status === 'success' && <div className="upload-feedback upload-feedback--success" role="status"><strong>Tải lên hoàn tất</strong><p>Dự án và tệp phương tiện đã được lưu.</p><Link className="button button--primary button--md" to="/projects">Tiếp tục đến dự án</Link></div>}
        {(status === 'idle' || status === 'selected') && <Button type="button" size="lg" disabled={!canUpload} onClick={startUpload}>Tải lên và tiếp tục<Icon name="arrow" width="18" /></Button>}
        {status === 'validating' && <Button type="button" size="lg" loading disabled>Đang kiểm tra...</Button>}
      </Card>
    </div>
  </>
}
