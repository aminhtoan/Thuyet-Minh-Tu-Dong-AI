import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { env } from '../../config/env'
import { trackListen } from '../analytics/analyticsService'
import { publicAudioOptionKey, publicAudioOptionLabel } from './publicAudioOptions.mjs'

export interface PublicLanguageOption {
  code: string
  name: string
  flag: string
  projectId: string
  narrationId?: string
  audioUrl?: string
  type?: 'ORIGINAL_AUDIO' | 'AI_NARRATION'
  optionId?: string
}

interface AudioGuideModalProps {
  projectId: string
  projectName: string
  initialLanguage?: string
  availableLanguages: PublicLanguageOption[]
  onClose: () => void
}

const unavailableMessage =
  'Không thể tải bản thuyết minh công khai. Bản thu có thể không còn khả dụng hoặc kết nối mạng đang gián đoạn.'

function publicAudioUrl(value?: string) {
  const audioUrl = value?.trim()
  if (!audioUrl) return null
  return /^https?:\/\//i.test(audioUrl)
    ? audioUrl
    : `${env.apiBaseUrl.replace(/\/api\/?$/, '')}${audioUrl.startsWith('/') ? '' : '/'}${audioUrl}`
}

export function AudioGuideModal({
  projectId,
  projectName,
  initialLanguage,
  availableLanguages,
  onClose,
}: AudioGuideModalProps) {
  const firstOption = availableLanguages.find(language => publicAudioOptionKey(language) === initialLanguage || language.code === initialLanguage) || availableLanguages[0]
  const initialLang = firstOption ? publicAudioOptionKey(firstOption) : ''
  const [currentLang, setCurrentLang] = useState<string>(initialLang)
  const selectedLanguage = useMemo(
    () =>
      availableLanguages.find((language) => publicAudioOptionKey(language) === currentLang) ||
      availableLanguages[0],
    [availableLanguages, currentLang]
  )
  const audioUrl = useMemo(() => publicAudioUrl(selectedLanguage?.audioUrl), [selectedLanguage])
  const [loadingAudio, setLoadingAudio] = useState(Boolean(audioUrl))
  const [audioError, setAudioError] = useState<string | null>(audioUrl ? null : unavailableMessage)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const lastTrackedAudioRef = useRef<string | null>(null)
  const playbackGeneration = useRef(0)

  const trackAudioPlay = () => {
    if (!audioUrl || selectedLanguage?.type === 'ORIGINAL_AUDIO' || lastTrackedAudioRef.current === audioUrl) return
    lastTrackedAudioRef.current = audioUrl
    void trackListen({
      platform: 'web',
      projectId: selectedLanguage?.projectId || projectId,
      languageCode: selectedLanguage?.code || '',
    })
  }

  const stopPlayback = useCallback((releaseSource = false) => {
    playbackGeneration.current++
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    if (releaseSource) {
      audio.removeAttribute('src')
      audio.load()
    }
  }, [])

  const handleClose = useCallback(() => {
    stopPlayback(true)
    onClose()
  }, [onClose, stopPlayback])

  // Keep keyboard focus inside the modal and restore the opening control on close.
  useEffect(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    dialogRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
        return
      }
      if (e.key !== 'Tab' || !dialogRef.current) return
      const controls = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        )
      )
      if (controls.length === 0) {
        e.preventDefault()
        dialogRef.current.focus()
        return
      }
      const first = controls[0]
      const last = controls[controls.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      stopPlayback(true)
      returnFocusRef.current?.focus()
    }
  }, [handleClose, stopPlayback])

  const selectLanguage = (language: PublicLanguageOption) => {
    if (publicAudioOptionKey(language) === currentLang) return
    stopPlayback()
    const nextAudioUrl = publicAudioUrl(language.audioUrl)
    setCurrentLang(publicAudioOptionKey(language))
    setIsPlaying(false)
    setCurrentTime(0)
    setDuration(0)
    setLoadingAudio(Boolean(nextAudioUrl))
    setAudioError(nextAudioUrl ? null : unavailableMessage)
  }

  useEffect(() => {
    if (!audioUrl || !loadingAudio) return
    const loadingTimeout = window.setTimeout(() => {
      setLoadingAudio(false)
      setAudioError(unavailableMessage)
    }, 15_000)
    return () => window.clearTimeout(loadingTimeout)
  }, [audioUrl, loadingAudio])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      const generation = playbackGeneration.current
      audioRef.current.play().catch(() => {
        if (playbackGeneration.current !== generation) return
        setIsPlaying(false)
        setLoadingAudio(false)
        setAudioError(unavailableMessage)
      })
    }
  }

  const handleTimeUpdate = () => {
    if (!audioRef.current) return
    setCurrentTime(audioRef.current.currentTime)
  }

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return
    const measuredDuration = audioRef.current.duration
    setDuration(Number.isFinite(measuredDuration) && measuredDuration > 0 ? measuredDuration : 0)
    setLoadingAudio(false)
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
    <div className="museum-audio-modal__backdrop" onClick={handleClose}>
      <div
        ref={dialogRef}
        className="museum-audio-modal__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="museum-audio-modal-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="museum-audio-modal__header">
          <div>
            <span className="museum-audio-modal__location">{selectedLanguage?.type === 'ORIGINAL_AUDIO' ? 'Âm thanh gốc' : 'Thuyết minh AI'} · Bản thu công khai</span>
            <h2 id="museum-audio-modal-title" className="museum-audio-modal__title">{projectName}</h2>
          </div>
          <button
            type="button"
            className="museum-audio-modal__close"
            onClick={handleClose}
            aria-label="Đóng cửa sổ nghe"
          >
            ✕
          </button>
        </div>

        {/* Language selector chips */}
        <div className="museum-audio-modal__languages" role="group" aria-labelledby="museum-audio-language-label">
          <span id="museum-audio-language-label" className="museum-audio-modal__lang-label">
            Chọn phiên bản âm thanh:
          </span>
          <div className="museum-audio-modal__lang-chips">
            {availableLanguages.length > 0 ? (
              availableLanguages.map((language) => {
                const isSelected = publicAudioOptionKey(language) === currentLang
                return (
                  <button
                    key={publicAudioOptionKey(language)}
                    type="button"
                    className={`museum-audio-modal__lang-chip${
                      isSelected ? ' museum-audio-modal__lang-chip--active' : ''
                    }`}
                    aria-pressed={isSelected}
                    onClick={() => selectLanguage(language)}
                  >
                    <span>{language.flag || '🌐'}</span>
                    <strong>{publicAudioOptionLabel(language)}</strong>
                    {language.audioUrl && (
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
                <strong>Chưa có âm thanh công khai</strong>
              </button>
            )}
          </div>
        </div>

        {/* Audio Player UI */}
        <div className="museum-audio-modal__player" aria-busy={loadingAudio}>
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onPlay={() => {
                setLoadingAudio(false)
                setIsPlaying(true)
                trackAudioPlay()
              }}
              onPause={() => setIsPlaying(false)}
              onEnded={() => {
                setIsPlaying(false)
                setCurrentTime(0)
              }}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onCanPlay={() => setLoadingAudio(false)}
              onError={() => {
                setIsPlaying(false)
                setLoadingAudio(false)
                setAudioError(unavailableMessage)
              }}
              preload="metadata"
            />
          )}

          <div className="museum-audio-modal__player-main">
            <button
              type="button"
              className={`museum-audio-modal__play-btn${
                isPlaying ? ' museum-audio-modal__play-btn--playing' : ''
              }`}
              onClick={togglePlay}
              disabled={!audioUrl || Boolean(audioError)}
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
                  {audioError
                    ? 'Không thể phát bản thu'
                    : loadingAudio
                    ? 'Đang tải tệp âm thanh...'
                    : audioUrl
                    ? isPlaying
                      ? 'Đang phát thuyết minh'
                      : 'Sẵn sàng phát'
                    : 'Chưa có tệp âm thanh'}
                </span>
                <span>{formatTime(duration)}</span>
              </div>
              <input
                type="range"
                className="museum-audio-modal__progress"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                disabled={!audioUrl || loadingAudio || Boolean(audioError) || duration <= 0}
                aria-label="Thanh trượt thời gian âm thanh"
              />
            </div>
          </div>

          {audioError && (
            <p className="museum-audio-modal__error" role="alert">
              {audioError}
            </p>
          )}

          {!audioError && (
            <p className="visually-hidden" role="status" aria-live="polite">
              {loadingAudio ? 'Đang tải bản thuyết minh công khai.' : isPlaying ? 'Đang phát bản thuyết minh.' : 'Bản thuyết minh sẵn sàng phát.'}
            </p>
          )}

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

      </div>
    </div>
  )
}
