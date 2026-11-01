import { useEffect, useState } from 'react'
import { AudioGuideModal, type PublicLanguageOption } from '../../features/results/AudioGuideModal'
import { env } from '../../config/env'

interface GroupedAudioGuide {
  key: string
  title: string
  description?: string
  mediaType: string
  languages: PublicLanguageOption[]
}

export function MuseumCustomerAudioSection() {
  const [guides, setGuides] = useState<GroupedAudioGuide[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLangs, setSelectedLangs] = useState<Record<string, string>>({})
  const [activeItem, setActiveItem] = useState<{
    id: string
    name: string
    language: string
    availableLanguages: PublicLanguageOption[]
  } | null>(null)

  useEffect(() => {
    let active = true

    async function fetchGuides() {
      try {
        setLoading(true)
        const res = await fetch(`${env.apiBaseUrl}/projects/public-audio-guides`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = (await res.json()) as {
          success: boolean
          data?: { guides?: GroupedAudioGuide[] }
        }
        if (!active) return
        if (json.success && json.data?.guides) {
          setGuides(json.data.guides)
        }
      } catch {
        if (active) setGuides([])
      } finally {
        if (active) setLoading(false)
      }
    }

    void fetchGuides()
    return () => {
      active = false
    }
  }, [])

  const handleOpenAudio = (guide: GroupedAudioGuide, chosenLangCode: string) => {
    const targetOption =
      guide.languages.find((l) => l.code === chosenLangCode) || guide.languages[0]
    if (!targetOption) return

    setActiveItem({
      id: targetOption.projectId,
      name: guide.title,
      language: targetOption.code,
      availableLanguages: guide.languages,
    })
  }

  return (
    <section className="museum-audio-section" aria-label="Thuyết minh âm thanh AI">
      <div className="museum-audio-section__header">
        <p className="museum-video__eyebrow">Thư viện thuyết minh</p>
        <h2 className="museum-audio-section__title">Âm thanh thuyết minh đa ngôn ngữ</h2>
        <p className="museum-audio-section__desc">
          Các bản thu thuyết minh được đồng bộ từ dự án hoàn chỉnh. Chọn ngôn ngữ trong menu thả xuống trên từng card để lắng nghe giọng đọc AI.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
          <p>Đang tải danh sách thuyết minh âm thanh...</p>
        </div>
      ) : guides.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '36px 24px',
            textAlign: 'center',
            maxWidth: '640px',
            margin: '0 auto',
            color: '#64748b',
          }}
        >
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🎧</div>
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
            Chưa có bản thu thuyết minh công khai
          </h3>
          <p style={{ fontSize: '14px', lineHeight: 1.6, margin: 0 }}>
            Các bản thuyết minh âm thanh hoàn thành từ hệ thống sẽ tự động xuất hiện tại đây để khách tham quan lắng nghe.
          </p>
        </div>
      ) : (
        <div className="museum-audio-grid">
          {guides.map((guide) => {
            const isAudio = guide.mediaType === 'AUDIO'
            const activeLangCode = selectedLangs[guide.key] || guide.languages[0]?.code || 'vi'

            return (
              <article
                key={guide.key}
                className="museum-audio-card"
                onClick={() => handleOpenAudio(guide, activeLangCode)}
                tabIndex={0}
                role="button"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleOpenAudio(guide, activeLangCode)
                  }
                }}
              >
                {/* Media area with vibrant gradient, badges, and central play button */}
                <div className="museum-audio-card__media">
                  {/* Top-left pill badge */}
                  <span className="museum-audio-card__media-badge-top">
                    <svg
                      viewBox="0 0 24 24"
                      width="14"
                      height="14"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                    </svg>
                    <span>{isAudio ? 'Âm thanh' : 'Video'}</span>
                  </span>

                  {/* Centered white circular play button */}
                  <div className="museum-audio-card__play-btn" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="#4f46e5">
                      <path d="M8 5.14v14l11-7-11-7z" />
                    </svg>
                  </div>

                  {/* Bottom-left languages badge */}
                  <span className="museum-audio-card__media-badge-bottom">
                    {guide.languages.length} ngôn ngữ
                  </span>
                </div>

                {/* Content area */}
                <div className="museum-audio-card__content">
                  <h3 className="museum-audio-card__title">{guide.title}</h3>
                  <p className="museum-audio-card__desc">
                    {guide.description ||
                      `Bản thu AI hoàn chỉnh có sẵn ${guide.languages.length} ngôn ngữ thuyết minh.`}
                  </p>

                  {/* Bottom action row: Language Picker + Listen Button */}
                  <div className="museum-audio-card__action-row">
                    <div
                      className="museum-audio-card__lang-picker"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="16"
                        height="16"
                        fill="none"
                        stroke="#64748b"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="museum-audio-card__globe-icon"
                        aria-hidden="true"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>

                      <select
                        id={`lang-${guide.key}`}
                        className="museum-audio-card__dropdown"
                        value={activeLangCode}
                        aria-label={`Chọn ngôn ngữ cho ${guide.title}`}
                        onChange={(e) => {
                          e.stopPropagation()
                          const newLang = e.target.value
                          setSelectedLangs((prev) => ({ ...prev, [guide.key]: newLang }))
                        }}
                      >
                        {guide.languages.map((l) => (
                          <option key={l.code} value={l.code}>
                            {l.name}
                          </option>
                        ))}
                      </select>

                      <svg
                        viewBox="0 0 24 24"
                        width="14"
                        height="14"
                        fill="none"
                        stroke="#64748b"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="museum-audio-card__chevron"
                        aria-hidden="true"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>

                    <button
                      type="button"
                      className="museum-audio-card__listen-btn"
                      aria-label={`Nghe thuyết minh: ${guide.title}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenAudio(guide, activeLangCode)
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="20"
                        height="20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {activeItem && (
        <AudioGuideModal
          projectId={activeItem.id}
          projectName={activeItem.name}
          initialLanguage={activeItem.language}
          availableLanguages={activeItem.availableLanguages}
          onClose={() => setActiveItem(null)}
        />
      )}
    </section>
  )
}
