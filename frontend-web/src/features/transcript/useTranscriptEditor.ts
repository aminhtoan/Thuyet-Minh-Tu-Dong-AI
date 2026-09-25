import { useCallback, useEffect, useRef, useState } from 'react'
import { transcriptService } from './transcriptService'
import { getSegmentErrors, hasSegmentEdits, hasTranscriptChanges } from './transcriptUtils'
import type { Transcript, TranscriptStatus } from './types'

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
  const canSave = Boolean(draft && dirty && !hasInvalidSegments && !busy && status !== 'FAILED')
  const canReset = !busy && hasSegmentEdits(draft, saved ?? generatedBaseline)

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
      setError(cause instanceof Error ? cause.message : 'Unable to load transcript.')
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
      setSaved(null)
      setGeneratedBaseline(copyTranscript(result))
      setStatus('READY')
    } catch (cause) {
      if (controller.signal.aborted) return
      setError(cause instanceof Error ? cause.message : 'Unable to generate transcript.')
      setFailedAction('generate')
      setStatus('FAILED')
    }
  }

  function updateSegment(segmentId: string, text: string) {
    if (busy) return
    setDraft((current) => current && { ...current, segments: current.segments.map((segment) => segment.id === segmentId ? { ...segment, text } : segment) })
    setStatus('READY')
    setError(null)
    setFailedAction(null)
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
      setError(cause instanceof Error ? cause.message : 'Unable to save transcript.')
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

  return { status, draft, dirty, segmentErrors, hasInvalidSegments, canSave, canReset, error, failedAction, generate, updateSegment, saveTranscript, resetChanges, retryLoad }
}
