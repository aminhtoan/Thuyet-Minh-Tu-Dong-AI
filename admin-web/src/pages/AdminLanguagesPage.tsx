import { useState } from 'react';
import { AdminPageHeader } from '../components/layout/AdminPageHeader';
import { DataTable } from '../components/common/DataTable';
import { Badge } from '../components/common/Badge';
import { CatalogList } from '../components/catalog/CatalogList';
import { useCatalogResource } from '../hooks/useCatalogResource';
import { adminLanguageService } from '../services/adminLanguageService';

export function AdminLanguagesPage() {
  const [search, setSearch] = useState('');
  const resource = useCatalogResource(adminLanguageService.getLanguages);
  const data = resource.data ?? [];
  const items = data.filter(language => `${language.code} ${language.name} ${language.nativeName}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="catalog-page languages-page">
    <AdminPageHeader title="Ngôn ngữ" description="Danh mục ngôn ngữ từ backend (chỉ đọc)." />
    <CatalogList {...resource} search={search} onSearch={setSearch} label="Tìm kiếm ngôn ngữ" count={items.length} total={data.length} noun="ngôn ngữ" icon="languages"
      notice="Backend hiện chưa hỗ trợ thêm, sửa hoặc thay đổi trạng thái ngôn ngữ.">
      <DataTable caption="Danh sách ngôn ngữ" className="catalog-table" minWidth={650}>
        <thead><tr>{['Ngôn ngữ', 'Mã', 'Tên quốc tế', 'Giọng đọc', 'Trạng thái'].map(label => <th scope="col" key={label}>{label}</th>)}</tr></thead>
        <tbody>{items.map(language => <tr key={language.id}>
          <td><strong>{language.nativeName}</strong></td><td>{language.code.toUpperCase()}</td><td>{language.name}</td><td>{language.voiceCount}</td>
          <td><Badge tone={language.isActive ? 'success' : 'neutral'}>{language.isActive ? 'Đang hoạt động' : 'Đã tắt'}</Badge></td>
        </tr>)}</tbody>
      </DataTable>
    </CatalogList>
  </div>;
}
