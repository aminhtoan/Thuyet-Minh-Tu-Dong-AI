import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/common/Button'
import { Icon } from '../components/common/Icon'
import { Card } from '../components/common/Card'
import { Input } from '../components/common/Input'
import { ProgressBar } from '../components/common/ProgressBar'
import { PageHeader } from '../components/layout/PageHeader'
import { formatFileSize, MAX_MEDIA_FILE_SIZE, validateMediaFile, validateProjectName, type UploadStatus } from '../features/projects/mediaUpload'
import { uploadProjectMedia } from '../features/projects/uploadService'
import { sourceLanguageOptions } from '../features/projects/projectUtils'
import type { LanguageCode } from '../features/projects/types'
import '../styles/upload.css'

export function NewProjectPlaceholder() {
  const [projectName, setProjectName] = useState('')
  const [nameTouched, setNameTouched] = useState(false)
  const [sourceLanguage, setSourceLanguage] = useState<LanguageCode | ''>('')
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<UploadStatus>('idle')
  const [progress, setProgress] = useState(0)
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
    const result = validateMediaFile(file && { name: file.name, size: file.size, mimeType: file.type })
    if (nameError || !sourceLanguage || !result.valid || !file || busy) return
    setStatus('validating')
    setUploadError(null)
    setProgress(0)
    const controller = new AbortController()
    controllerRef.current = controller
    try {
      setStatus('uploading')
      await uploadProjectMedia({ projectName: projectName.trim(), sourceLanguage, file, signal: controller.signal, onProgress: setProgress })
      if (!controller.signal.aborted) setStatus('success')
    } catch (error) {
      if (controller.signal.aborted) setStatus('cancelled')
      else { setStatus('failed'); setUploadError(error instanceof Error ? error.message : 'Upload failed. Please retry.') }
    } finally { if (controllerRef.current === controller) controllerRef.current = null }
  }
  function cancelUpload() { controllerRef.current?.abort(); setStatus('cancelled') }

  return <>
    <PageHeader title="Dự án mới" description="Thêm thông tin và chọn video hoặc âm thanh để bắt đầu." actions={<Link className="button button--secondary button--md" to="/projects">Về danh sách dự án</Link>} />
    <div className="upload-layout">
      <Card padding="lg" className="upload-form-card">
        <div className="upload-section-heading"><span className="upload-step">01</span><div><h2>Chi tiết dự án</h2><p>Name your project and select the language spoken in the original media.</p></div></div>
        <div className="upload-fields">
          <Input label="Project name" required maxLength={100} placeholder="e.g. Product introduction" value={projectName} onChange={(event) => setProjectName(event.target.value)} onBlur={() => setNameTouched(true)} error={nameTouched ? nameError ?? undefined : undefined} helperText="At least 3 characters." disabled={busy || status === 'success'} />
          <div className="field"><label className="field__label" htmlFor="source-language">Source language <span className="field__required" aria-hidden="true">*</span></label><select id="source-language" className="upload-select" value={sourceLanguage} onChange={(event) => setSourceLanguage(event.target.value as LanguageCode | '')} disabled={busy || status === 'success'} required><option value="">Select language</option>{sourceLanguageOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><p className="field__message">Language spoken in your media.</p></div>
        </div>
      </Card>
      <Card padding="lg" className="upload-form-card">
        <div className="upload-section-heading"><span className="upload-step">02</span><div><h2>Tệp phương tiện</h2><p>MP4, MOV, WEBM, MP3, WAV or M4A · up to {formatFileSize(MAX_MEDIA_FILE_SIZE)}</p></div></div>
        <input ref={inputRef} id="media-file" className="visually-hidden" type="file" accept=".mp4,.mov,.webm,.mp3,.wav,.m4a,video/mp4,video/quicktime,video/webm,audio/mpeg,audio/wav,audio/mp4" onChange={onBrowseChange} disabled={busy || status === 'success'} aria-label="Choose video or audio file" />
        {!file ? <div className={`upload-dropzone${dragOver ? ' upload-dropzone--active' : ''}`} onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
          <div className="upload-dropzone__symbol" aria-hidden="true"><Icon name="video" width="25" /></div><strong>Kéo thả video hoặc âm thanh vào đây</strong><span>hoặc chọn tệp từ máy tính</span><Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>Browse Files</Button><small>Dung lượng tối đa: {formatFileSize(MAX_MEDIA_FILE_SIZE)}</small>
        </div> : <div className={`upload-file${validation.valid ? '' : ' upload-file--invalid'}`}>
          <div className="upload-file__head"><span className="upload-file__type">{validation.valid ? validation.mediaType === 'VIDEO' ? 'Video' : 'Audio' : 'Invalid file'}</span><div className="upload-file__actions"><Button type="button" size="sm" variant="secondary" disabled={busy || status === 'success'} onClick={() => inputRef.current?.click()}>Change</Button><Button type="button" size="sm" variant="ghost" disabled={busy || status === 'success'} onClick={removeFile}>Remove</Button></div></div>
          <strong className="upload-file__name">{file.name}</strong><span className="upload-file__size">{formatFileSize(file.size)}</span>
          {validation.valid && previewUrl && (validation.mediaType === 'VIDEO' ? <video className="upload-preview" src={previewUrl} controls preload="metadata" aria-label="Selected video preview" /> : <audio className="upload-preview" src={previewUrl} controls preload="metadata" aria-label="Selected audio preview" />)}
        </div>}
        {file && !validation.valid && <p className="upload-error" role="alert">{validation.error}</p>}
      </Card>
      <Card padding="lg" className="upload-form-card upload-action-card">
        <div className="upload-section-heading"><span className="upload-step">03</span><div><h2>Tải lên</h2><p>Dự án và tệp phương tiện sẽ được lưu qua backend.</p></div></div>
        {status === 'uploading' && <div className="upload-feedback"><ProgressBar value={progress} label="Uploading media" /><Button type="button" variant="secondary" onClick={cancelUpload}>Cancel upload</Button></div>}
        {status === 'cancelled' && <div className="upload-feedback" role="status"><strong>Đã hủy tải lên</strong><p>Tệp vẫn đang được chọn. Bạn có thể thử lại khi sẵn sàng.</p><div className="upload-actions"><Button type="button" onClick={startUpload}>Thử lại</Button><Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>Chọn tệp khác</Button></div></div>}
        {status === 'failed' && <div className="upload-feedback" role="alert"><strong>Tải lên thất bại</strong><p>{uploadError ?? 'Không thể tải tệp phương tiện lên.'}</p><div className="upload-actions"><Button type="button" onClick={startUpload}>Thử lại</Button><Button type="button" variant="secondary" onClick={() => inputRef.current?.click()}>Chọn tệp khác</Button></div></div>}
        {status === 'success' && <div className="upload-feedback upload-feedback--success" role="status"><strong>Tải lên hoàn tất</strong><p>Dự án và tệp phương tiện đã được lưu.</p><Link className="button button--primary button--md" to="/projects">Tiếp tục đến dự án</Link></div>}
        {(status === 'idle' || status === 'selected') && <Button type="button" size="lg" disabled={!canUpload} onClick={startUpload}>Upload &amp; Continue</Button>}
        {status === 'validating' && <Button type="button" size="lg" loading disabled>Validating...</Button>}
      </Card>
    </div>
  </>
}
