import { useEffect, useRef, useState } from 'react'
import { resultService, type LanguageVariant } from './resultService'
import type { Result } from './types'
import { languageNames } from '../projects/projectUtils'

import { env } from '../../config/env'

export interface PublicLanguageOption {
  code: string
  name: string
  flag: string
  projectId: string
  narrationId?: string
  audioUrl?: string
}

interface AudioGuideModalProps {
  projectId: string
  projectName: string
  initialLanguage?: string
  availableLanguages?: PublicLanguageOption[]
  onClose: () => void
}

export function AudioGuideModal({
  projectId,
  projectName,
  initialLanguage,
  availableLanguages,
  onClose,
}: AudioGuideModalProps) {
  const [variants, setVariants] = useState<LanguageVariant[]>([])
  const [currentLang, setCurrentLang] = useState<string>(initialLanguage || 'vi')
  const [result, setResult] = useState<Result | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [loadingAudio, setLoadingAudio] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Load language variants
  useEffect(() => {
    if (availableLanguages && availableLanguages.length > 0) {
      setVariants(
        availableLanguages.map((l) => ({
          projectId: l.projectId,
          language: l.code,
          name: l.name,
          flag: l.flag,
          hasResult: true,
          status: 'READY',
          isCurrent: l.code === currentLang,
        }))
      )
      return
    }

    let active = true
    void resultService.getLanguageVariants(projectId, currentLang).then((items) => {
      if (!active) return
      setVariants(items)
      if (items.length > 0 && !items.some((v) => v.language === currentLang)) {
        const firstReady = items.find((v) => v.hasResult) || items[0]
        if (firstReady) setCurrentLang(firstReady.language)
      }
    })
    return () => {
      active = false
    }
  }, [projectId, availableLanguages, currentLang])

  // Load result audio for the selected language
  useEffect(() => {
    let active = true
    let blobUrl: string | null = null
    setLoadingAudio(true)
    setIsPlaying(false)
    setCurrentTime(0)

    if (availableLanguages && availableLanguages.length > 0) {
      const match = availableLanguages.find((l) => l.code === currentLang) || availableLanguages[0]
      if (match?.audioUrl) {
        const fullUrl = match.audioUrl.startsWith('http')
          ? match.audioUrl
          : `${env.apiBaseUrl.replace(/\/api\/?$/, '')}${match.audioUrl}`
        setAudioUrl(fullUrl)
        setLoadingAudio(false)
        return
      }
    }

    resultService
      .getByProjectId(projectId, currentLang)
      .then(async (res) => {
        if (!active) return
        setResult(res)
        if (res && res.filePath) {
          try {
            const blob = await resultService.getFile(res)
            if (!active) return
            blobUrl = URL.createObjectURL(blob)
            setAudioUrl(blobUrl)
          } catch {
            if (active) setAudioUrl(null)
          }
        } else {
          setAudioUrl(null)
        }
      })
      .catch(() => {
        if (active) {
          setResult(null)
          setAudioUrl(null)
        }
      })
      .finally(() => {
        if (active) setLoadingAudio(false)
      })

    return () => {
      active = false
      if (blobUrl) URL.revokeObjectURL(blobUrl)
    }
  }, [projectId, currentLang, availableLanguages])

  // Auto-play when audioUrl is ready
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play().catch(() => {
        // Autoplay may be blocked by browser policy until user clicks play
      })
    }
  }, [audioUrl])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play().catch(() => {})
    }
  }

  const handleTimeUpdate = () => {
    if (!audioRef.current) return
    setCurrentTime(audioRef.current.currentTime)
  }

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return
    setDuration(audioRef.current.duration || result?.duration || 0)
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value)
    setCurrentTime(time)
    if (audioRef.current) {
      audioRef.current.currentTime = time
    }
  }

  const formatTime = (secs: number) => {
    if (!Number.isFinite(secs) || secs < 0) return '0:00'
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return (
    <div className="museum-audio-modal__backdrop" onClick={onClose}>
      <div
        className="museum-audio-modal__card"
        role="dialog"
        aria-modal="true"
        aria-label={`Thuyết minh âm thanh: ${projectName}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="museum-audio-modal__header">
          <div>
            <span className="museum-audio-modal__location">Thuyết minh AI · Bản thu hoàn chỉnh</span>
            <h2 className="museum-audio-modal__title">{projectName}</h2>
          </div>
          <button
            type="button"
            className="museum-audio-modal__close"
            onClick={onClose}
            aria-label="Đóng cửa sổ nghe"
          >
            ✕
          </button>
        </div>

        {/* Language selector chips */}
        <div className="museum-audio-modal__languages">
          <label className="museum-audio-modal__lang-label">
            Chọn ngôn ngữ thuyết minh:
          </label>
          <div className="museum-audio-modal__lang-chips">
            {variants.length > 0 ? (
              variants.map((v) => {
                const isSelected = v.language === currentLang
                return (
                  <button
                    key={v.language}
                    type="button"
                    className={`museum-audio-modal__lang-chip${
                      isSelected ? ' museum-audio-modal__lang-chip--active' : ''
                    }`}
                    onClick={() => setCurrentLang(v.language)}
                  >
                    <span>{v.flag || '🌐'}</span>
                    <strong>{v.name || languageNames[v.language] || v.language}</strong>
                    {v.hasResult && (
                      <span
                        style={{
                          display: 'inline-block',
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: isSelected ? '#38bdf8' : '#10b981',
                          marginLeft: 'auto',
                        }}
                        title="Đã có tệp thuyết minh"
                      />
                    )}
                  </button>
                )
              })
            ) : (
              <button
                type="button"
                className="museum-audio-modal__lang-chip museum-audio-modal__lang-chip--active"
              >
                <span>🌐</span>
                <strong>{languageNames[currentLang] || currentLang}</strong>
              </button>
            )}
          </div>
        </div>

        {/* Audio Player UI */}
        <div className="museum-audio-modal__player">
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              autoPlay
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => {
                setIsPlaying(false)
                setCurrentTime(0)
              }}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onError={(e) => {
                console.error('Lỗi phát âm thanh:', e)
              }}
              preload="auto"
            />
          )}

          <div className="museum-audio-modal__player-main">
            <button
              type="button"
              className={`museum-audio-modal__play-btn${
                isPlaying ? ' museum-audio-modal__play-btn--playing' : ''
              }`}
              onClick={togglePlay}
              disabled={loadingAudio || !audioUrl}
              aria-label={isPlaying ? 'Tạm dừng' : 'Phát thuyết minh'}
              title={isPlaying ? 'Tạm dừng' : 'Phát thuyết minh'}
            >
              {loadingAudio ? (
                <span style={{ fontSize: '0.75rem' }}>...</span>
              ) : isPlaying ? (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                  <path d="M8 5v14l11-7Z" />
                </svg>
              )}
            </button>

            <div className="museum-audio-modal__scrubber">
              <div className="museum-audio-modal__times">
                <span>{formatTime(currentTime)}</span>
                <span className="museum-audio-modal__status-badge">
                  {loadingAudio
                    ? 'Đang tải tệp âm thanh...'
                    : audioUrl
                    ? isPlaying
                      ? 'Đang phát thuyết minh'
                      : 'Sẵn sàng phát'
                    : 'Chưa có tệp âm thanh'}
                </span>
                <span>{formatTime(duration || result?.duration || 0)}</span>
              </div>
              <input
                type="range"
                className="museum-audio-modal__progress"
                min={0}
                max={duration || result?.duration || 100}
                value={currentTime}
                onChange={handleSeek}
                disabled={!audioUrl}
                aria-label="Thanh trượt thời gian âm thanh"
              />
            </div>
          </div>

          <div
            className={`museum-audio-modal__waves${
              isPlaying ? ' museum-audio-modal__waves--active' : ''
            }`}
            aria-hidden="true"
          >
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>

        {/* Audio info footer */}
        {result && (
          <div className="museum-audio-modal__transcript">
            <p className="museum-audio-modal__transcript-title">
              Thông tin bản thu ({languageNames[currentLang] || currentLang})
            </p>
            <p className="museum-audio-modal__transcript-text">
              {result.voiceName ? `Giọng đọc AI: ${result.voiceName} · ` : ''}
              {result.fileSize ? `Dung lượng: ${(result.fileSize / 1024).toFixed(1)} KB · ` : ''}
              Định dạng: MP3 audio chất lượng cao.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
