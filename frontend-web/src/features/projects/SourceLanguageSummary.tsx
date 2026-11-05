import { Badge } from '../../components/common/Badge'
import { sourceLanguageLabel, sourceState, sourceStatusLabels } from './sourceLanguage'
import type { Project } from './types'
import '../../styles/source-language.css'

export function SourceLanguageSummary({ project }: { project: Project }) {
  const source = sourceState(project)
  return <section className="source-language-summary" aria-label="Thông tin ngôn ngữ nguồn">
    <dl><div><dt>Chế độ nguồn</dt><dd>{source.mode === 'AUTO' ? 'Tự động (AUTO)' : 'Thủ công (MANUAL)'}</dd></div>
      <div><dt>Ngôn ngữ đã xác nhận</dt><dd>{sourceLanguageLabel(source.language)}</dd></div>
      <div><dt>Trạng thái nguồn</dt><dd><Badge variant={source.confirmed ? 'success' : 'warning'}>{sourceStatusLabels[source.status]}</Badge></dd></div>
      {source.detected && <div><dt>Ngôn ngữ được phát hiện</dt><dd>{sourceLanguageLabel(source.detected)}</dd></div>}
    </dl>
    {!source.confirmed && <p>{source.status === 'NEEDS_CONFIRMATION' ? 'Hãy đọc bản ghi và xác nhận ngôn ngữ chính trước khi dịch.' : 'Nguồn chưa xác định. Sau khi có bản ghi, hãy kiểm tra và xác nhận ngôn ngữ trước khi dịch.'}</p>}
  </section>
}
