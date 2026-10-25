import { Card } from '../common/Card';
import type { TopLanguageItem } from '../../types/dashboard';

export function LanguageDistributionCard({ items }: { items?: TopLanguageItem[] }) {
  const languages = Array.isArray(items) ? items : [];

  return (
    <Card className="language-distribution-card">
      <div className="section-heading">
        <h2>Phân bố lượt nghe theo ngôn ngữ</h2>
      </div>
      <p className="muted">Tỷ lệ lượt nghe giữa các ngôn ngữ thuyết minh.</p>
      {!languages.length ? (
        <p className="dashboard-empty">Chưa có dữ liệu lượt nghe ngôn ngữ.</p>
      ) : (
        <ul className="lang-dist-list" aria-label="Phân bố lượt nghe theo ngôn ngữ">
          {languages.map((item) => {
            const pct = Math.min(100, Math.max(0, item.percentage));
            return (
              <li key={item.code} className="lang-dist-item">
                <div className="lang-dist-header">
                  <div className="lang-dist-label">
                    <span className="lang-dist-flag" aria-hidden="true">{item.flag}</span>
                    <strong className="lang-dist-name">{item.name}</strong>
                    <span className="lang-dist-code">({item.code.toUpperCase()})</span>
                  </div>
                  <div className="lang-dist-stats">
                    <span className="lang-dist-count">{item.count.toLocaleString('vi-VN')} lượt</span>
                    <strong className="lang-dist-percentage">{pct.toFixed(1)}%</strong>
                  </div>
                </div>
                <div
                  className="lang-dist-bar"
                  role="progressbar"
                  aria-label={`Tỷ lệ ${item.name}`}
                  aria-valuenow={pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <span className="lang-dist-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <div className="lang-dist-breakdown">
                  <span>Web: {item.web.toLocaleString('vi-VN')}</span>
                  <span>Mobile: {item.mobile.toLocaleString('vi-VN')}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
