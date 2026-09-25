import { projectRepository } from '../projects/projectRepository'
import { mockSegmentStarts, mockTranscriptDuration, mockTranscriptLines } from './mockTranscriptData'
import { deriveFullText, getSegmentErrors } from './transcriptUtils'
import type { Transcript, TranscriptSegment } from './types'

type MockOptions = { signal?: AbortSignal; fail?: boolean }
const savedTranscripts = new Map<string, Transcript>()

function copyTranscript(transcript: Transcript): Transcript {
  return { ...transcript, segments: transcript.segments.map((segment) => ({ ...segment })) }
}

function waitForMock(ms: number, { signal, fail }: MockOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new Error('Operation cancelled')); return }
    const onAbort = () => { clearTimeout(timer); reject(new Error('Operation cancelled')) }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      if (fail) reject(new Error('Mock transcript operation failed. Please retry.'))
      else resolve()
    }, ms)
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function requireProject(projectId: string) {
  const project = projectRepository.getById(projectId)
  if (!project) throw new Error('Project not found.')
  return project
}

export const transcriptService = {
  async getTranscript(projectId: string, options: MockOptions = {}): Promise<Transcript | null> {
    await waitForMock(300, options)
    requireProject(projectId)
    const transcript = savedTranscripts.get(projectId)
    return transcript ? copyTranscript(transcript) : null
  },
  async generateTranscript(projectId: string, options: MockOptions = {}): Promise<Transcript> {
    await waitForMock(1100, options)
    const project = requireProject(projectId)
    if (project.status === 'DRAFT') throw new Error('Upload media before generating a transcript.')
    const lines = mockTranscriptLines[project.sourceLanguage]
    const now = new Date().toISOString()
    const segments: TranscriptSegment[] = lines.map((text, index) => ({
      id: `${projectId}-segment-${index + 1}`,
      sequence: index + 1,
      startTime: mockSegmentStarts[index],
      endTime: mockSegmentStarts[index + 1] ?? mockTranscriptDuration,
      text,
    }))
    return { id: `${projectId}-transcript`, projectId, languageCode: project.sourceLanguage, fullText: deriveFullText(segments), status: 'READY', segments, createdAt: now, updatedAt: now }
  },
  async saveTranscript(projectId: string, draft: Transcript, options: MockOptions = {}): Promise<Transcript> {
    await waitForMock(500, options)
    requireProject(projectId)
    if (draft.projectId !== projectId || draft.segments.length === 0 || Object.keys(getSegmentErrors(draft.segments)).length) throw new Error('Correct the transcript before saving.')
    const segments = draft.segments.map((segment) => ({ ...segment, text: segment.text.trim() }))
    const saved: Transcript = { ...draft, status: 'SAVED', segments, fullText: deriveFullText(segments), updatedAt: new Date().toISOString() }
    savedTranscripts.set(projectId, copyTranscript(saved))
    return copyTranscript(saved)
  },
}
