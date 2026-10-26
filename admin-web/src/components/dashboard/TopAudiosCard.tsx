import { Card } from '../common/Card';
import type { TopAudioItem } from '../../types/dashboard';

function stripLanguageSuffix(title: string): string {
  return title.replace(/\s*\((?:Tiếng\s+[^)]+|[A-Za-z\s]+)\)\s*$/i, '').trim() || title;
}

export function TopAudiosCard({ items }: { items?: TopAudioItem[] }) {
  const audios = Array.isArray(items) ? items : [];

  return (
    <Card className="top-audios-card">
      <div className="section-heading">
        <h2>Top MP3 / Thuyết minh nghe nhiều nhất</h2>
      </div>
      <p className="muted">Top 5 bản thu được phát nhiều nhất trên Web và Mobile.</p>
      {!audios.length ? (
        <p className="dashboard-empty">Chưa có dữ liệu lượt nghe thuyết minh.</p>
      ) : (
        <ol className="top-audios-list" aria-label="Danh sách bài thuyết minh nghe nhiều nhất">
          {audios.map((item, index) => (
            <li key={`${item.projectId}-${item.languageCode}`} className="top-audio-item">
              <span className="top-audio-rank" aria-hidden="true">{index + 1}</span>
              <div className="top-audio-content">
                <div className="top-audio-title-row">
                  <strong className="top-audio-title">{stripLanguageSuffix(item.title)}</strong>
                  <span className="top-audio-lang-badge" title={item.languageName}>
                    <span aria-hidden="true">{item.flag}</span> {item.languageName || item.languageCode.toUpperCase()}
                  </span>
                </div>
                <div className="top-audio-metrics">
                  <span className="top-audio-total">
                    <strong>{item.count.toLocaleString('vi-VN')}</strong> lượt nghe
                  </span>
                  <span className="top-audio-divider" aria-hidden="true">·</span>
                  <span className="top-audio-split">
                    Web: {item.web.toLocaleString('vi-VN')} · Mobile: {item.mobile.toLocaleString('vi-VN')}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
