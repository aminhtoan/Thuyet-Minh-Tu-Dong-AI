import { useState } from 'react';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { DataTable } from '../components/common/DataTable';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { CatalogList } from '../components/catalog/CatalogList';
import { useCatalogResource } from '../hooks/useCatalogResource';
import { adminLanguageService } from '../services/adminLanguageService';
import { adminVoiceService } from '../services/adminVoiceService';

const genderLabels = { FEMALE: 'Nữ', MALE: 'Nam', NEUTRAL: 'Trung tính' };
const providerLabels: Record<string, string> = { gemini: 'Gemini', openai: 'OpenAI' };

export function AdminVoicesPage() {
  const [search, setSearch] = useState('');
  const resource = useCatalogResource(adminVoiceService.getVoices);
  const languages = useCatalogResource(adminLanguageService.getLanguages);
  const data = resource.data ?? [];
  const items = data.filter(voice => `${voice.name} ${voice.provider} ${voice.providerVoiceId}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="catalog-page voices-page">
    <AdminPageHeader title="Giọng đọc" description="Danh mục giọng đọc từ backend (chỉ đọc)." />
    <CatalogList {...resource} search={search} onSearch={setSearch} label="Tìm kiếm giọng đọc" count={items.length} total={data.length} noun="giọng đọc" icon="voices"
      notice="Thêm, sửa và kích hoạt giọng đọc chưa được backend hỗ trợ."
      supplementary={languages.error ? <div className="catalog-supplementary" role="status"><span>Không thể tải tên ngôn ngữ bổ trợ. Danh sách giọng đọc được tải độc lập.</span><Button variant="secondary" onClick={languages.retry}>Thử lại ngôn ngữ</Button></div> : languages.loading ? <p className="catalog-supplementary" role="status">Đang tải tên ngôn ngữ bổ trợ…</p> : undefined}>
      <DataTable caption="Danh sách giọng đọc" className="catalog-table voices-table" minWidth={1000}>
        <thead><tr>{['Giọng đọc', 'Ngôn ngữ', 'Giới tính', 'Nhà cung cấp', 'Mã Provider', 'Trạng thái'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody>{items.map(voice => {
          const language = languages.data?.find(item => item.id === voice.languageId);
          const languageName = language?.nativeName || voice.language?.name || voice.language?.code;
          return <tr key={voice.id}>
            <td className="catalog-voice-name"><strong>{voice.name}</strong><small>{voice.description}</small></td>
            <td className="catalog-language">{languageName || <><span>Chưa có thông tin ngôn ngữ</span>{voice.languageId && <small>ID: {voice.languageId}</small>}</>}</td>
            <td>{genderLabels[voice.gender] ?? voice.gender}</td><td>{providerLabels[voice.provider] ?? voice.provider}</td><td>{voice.providerVoiceId}</td>
            <td><Badge tone={voice.isActive ? 'success' : 'neutral'}>{voice.isActive ? 'Đang hoạt động' : 'Đã tắt'}</Badge></td>
          </tr>;
        })}</tbody>
      </DataTable>
    </CatalogList>
  </div>;
}
