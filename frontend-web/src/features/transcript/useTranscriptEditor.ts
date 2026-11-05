import { useCallback, useEffect, useRef, useState } from 'react'
import { transcriptService } from './transcriptService'
import { getSegmentErrors, hasTranscriptChanges } from './transcriptUtils'
import type { Transcript, TranscriptSegmentUpdate, TranscriptStatus } from './types'

type FailedAction = 'load' | 'generate' | 'save' | null

function copyTranscript(transcript: Transcript): Transcript {
  return { ...transcript, segments: transcript.segments.map((segment) => ({ ...segment })) }
}

export function useTranscriptEditor(projectId: string) {
  const [status, setStatus] = useState<TranscriptStatus>('LOADING')
  const [draft, setDraft] = useState<Transcript | null>(null)
  const [saved, setSaved] = useState<Transcript | null>(null)
  const [generatedBaseline, setGeneratedBaseline] = useState<Transcript | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [failedAction, setFailedAction] = useState<FailedAction>(null)
  const operationRef = useRef<AbortController | null>(null)
  const dirty = hasTranscriptChanges(draft, saved)
  const segmentErrors = draft ? getSegmentErrors(draft.segments) : {}
  const hasInvalidSegments = !draft?.segments.length || Object.keys(segmentErrors).length > 0
  const busy = status === 'LOADING' || status === 'GENERATING' || status === 'SAVING'
  const canSave = false
  const canReset = false

  const requestTranscript = useCallback(() => {
    operationRef.current?.abort()
    const controller = new AbortController()
    operationRef.current = controller
    void transcriptService.getTranscript(projectId, { signal: controller.signal }).then((result) => {
      if (controller.signal.aborted) return
      setDraft(result)
      setSaved(result)
      setGeneratedBaseline(result)
      setStatus(result ? 'SAVED' : 'NOT_STARTED')
    }).catch((cause: unknown) => {
      if (controller.signal.aborted) return
      setError(cause instanceof Error ? cause.message : 'Không thể tải bản ghi.')
      setFailedAction('load')
      setStatus('FAILED')
    })
  }, [projectId])

  useEffect(() => {
    requestTranscript()
    return () => operationRef.current?.abort()
  }, [requestTranscript])

  function retryLoad() {
    setStatus('LOADING')
    setError(null)
    setFailedAction(null)
    requestTranscript()
  }

  function acceptConfirmedTranscript(value: Transcript) {
    operationRef.current?.abort()
    setDraft(value)
    setSaved(copyTranscript(value))
    setGeneratedBaseline(copyTranscript(value))
    setStatus('SAVED')
    setError(null)
    setFailedAction(null)
  }

  function applySegmentUpdate(update: TranscriptSegmentUpdate) {
    const apply = (value: Transcript | null) => value ? {
      ...value,
      fullText: update.transcript.fullText,
      revision: update.transcript.revision,
      segments: value.segments.map((segment) => segment.backendSegmentId === update.segment.id
        ? { ...segment, text: update.segment.text }
        : segment),
    } : value
    setDraft((value) => apply(value))
    setSaved((value) => apply(value))
    setGeneratedBaseline((value) => apply(value))
    setStatus('SAVED')
    setError(null)
    setFailedAction(null)
  }

  async function generate() {
    if (busy) return
    operationRef.current?.abort()
    const controller = new AbortController()
    operationRef.current = controller
    setStatus('GENERATING')
    setError(null)
    setFailedAction(null)
    try {
      const result = await transcriptService.generateTranscript(projectId, { signal: controller.signal })
      if (controller.signal.aborted) return
      setDraft(result)
      setSaved(copyTranscript(result))
      setGeneratedBaseline(copyTranscript(result))
      setStatus('SAVED')
    } catch (cause) {
      if (controller.signal.aborted) return
      setError(cause instanceof Error ? cause.message : 'Không thể tạo bản ghi.')
      setFailedAction('generate')
      setStatus('FAILED')
    }
  }

  function updateSegment(segmentId: string, text: string) {
    void segmentId; void text
  }

  async function saveTranscript() {
    if (!draft || !dirty || hasInvalidSegments || busy) return
    operationRef.current?.abort()
    const controller = new AbortController()
    operationRef.current = controller
    setStatus('SAVING')
    setError(null)
    setFailedAction(null)
    try {
      const result = await transcriptService.saveTranscript(projectId, draft, { signal: controller.signal })
      if (controller.signal.aborted) return
      setDraft(result)
      setSaved(copyTranscript(result))
      setGeneratedBaseline(copyTranscript(result))
      setStatus('SAVED')
    } catch (cause) {
      if (controller.signal.aborted) return
      setError(cause instanceof Error ? cause.message : 'Không thể lưu bản ghi.')
      setFailedAction('save')
      setStatus('FAILED')
    }
  }

  function resetChanges() {
    const baseline = saved ?? generatedBaseline
    if (!baseline || !canReset) return
    setDraft(copyTranscript(baseline))
    setStatus(saved ? 'SAVED' : 'READY')
    setError(null)
    setFailedAction(null)
  }

  return { status, draft, dirty, segmentErrors, hasInvalidSegments, canSave, canReset, error, failedAction, generate, updateSegment, saveTranscript, resetChanges, retryLoad, refreshTranscript: requestTranscript, applySegmentUpdate, acceptConfirmedTranscript }
}
