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
            borderRadius: '12px',
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
            const activeOption =
              guide.languages.find((l) => l.code === activeLangCode) || guide.languages[0]

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
                <div className="museum-audio-card__media">
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                      color: '#38bdf8',
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="44"
                      height="44"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </svg>
                  </div>
                  <span className="museum-audio-card__location">
                    {isAudio ? 'ÂM THANH' : 'VIDEO'}
                  </span>
                  <span className="museum-audio-card__duration">
                    {guide.languages.length} ngôn ngữ
                  </span>
                </div>

                <div className="museum-audio-card__content">
                  <h3 className="museum-audio-card__title">{guide.title}</h3>
                  <p className="museum-audio-card__desc">
                    {guide.description ||
                      `Bản thu AI hoàn chỉnh có sẵn ${guide.languages.length} ngôn ngữ thuyết minh.`}
                  </p>

                  {/* Dropdown language selector on card */}
                  <div
                    className="museum-audio-card__lang-select-wrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <label htmlFor={`lang-${guide.key}`} className="museum-audio-card__lang-label">
                      🌐 Chọn ngôn ngữ:
                    </label>
                    <select
                      id={`lang-${guide.key}`}
                      className="museum-audio-card__dropdown"
                      value={activeLangCode}
                      onChange={(e) => {
                        e.stopPropagation()
                        const newLang = e.target.value
                        setSelectedLangs((prev) => ({ ...prev, [guide.key]: newLang }))
                      }}
                    >
                      {guide.languages.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.flag} {l.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="museum-audio-card__footer">
                    <span className="museum-audio-card__badge">
                      {activeOption ? `${activeOption.flag} ${activeOption.name}` : 'Sẵn sàng'}
                    </span>
                    <button
                      type="button"
                      className="museum-audio-card__btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleOpenAudio(guide, activeLangCode)
                      }}
                    >
                      Nghe thuyết minh 🎧
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
