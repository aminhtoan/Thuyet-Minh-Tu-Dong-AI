import { useId } from 'react'
import { getPublicVideoVariant, museumVideoLanguages, type MuseumPublicVideo, type MuseumVideoLanguage } from '../../features/museum/publicVideos'

export function MuseumVideoLanguages({ video, selected, onChange }: { video: MuseumPublicVideo; selected: MuseumVideoLanguage; onChange: (language: MuseumVideoLanguage) => void }) {
  const name = useId()
  return <fieldset className="museum-video__languages"><legend>Ngôn ngữ thuyết minh</legend>
    <p>Ngôn ngữ gốc: Tiếng Việt</p><div className="museum-video__language-grid">
      {museumVideoLanguages.map((language) => {
        const available = Boolean(getPublicVideoVariant(video, language.code))
        const declared = video.languageVariants.find((variant) => variant.language === language.code)
        return <label key={language.code} className={`museum-video__language${selected === language.code ? ' museum-video__language--selected' : ''}`}>
          <input type="radio" name={name} value={language.code} checked={selected === language.code} disabled={!available} onChange={() => { if (available) onChange(language.code) }} />
          <span><strong>{language.name}</strong><span lang="en">{language.internationalName} · {language.code}</span><small>{available ? 'Sẵn sàng' : declared?.state === 'PROCESSING' ? 'Đang xử lý' : 'Đang chuẩn bị'}</small></span>
        </label>
      })}
    </div>
  </fieldset>
}
