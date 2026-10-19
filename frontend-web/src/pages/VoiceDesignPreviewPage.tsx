import { Link } from 'react-router-dom';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { WorkflowSteps } from '../components/common/WorkflowSteps';
import { PageHeader } from '../components/layout/PageHeader';
import { VoiceCard } from '../features/voice/VoiceCard';
import type { Voice } from '../features/voice/types';
import '../styles/voice.css';

const previewVoices: Voice[] = [
  { id: 'design-preview-a', name: 'Giọng minh họa A', languageCode: 'en', gender: 'Female', description: 'Giọng nữ rõ ràng, nhịp đọc cân bằng.', isActive: true },
  { id: 'design-preview-b', name: 'Giọng minh họa B', languageCode: 'en', gender: 'Male', description: 'Giọng nam trầm, phù hợp nội dung thuyết minh.', isActive: true },
  { id: 'design-preview-c', name: 'Giọng minh họa C', languageCode: 'en', gender: 'Neutral', description: 'Giọng trung tính, cách đọc tự nhiên.', isActive: true },
];

const noAction = () => undefined;

export function VoiceDesignPreviewPage() {
  return <div className="voice-design-preview">
    <PageHeader title="Giọng đọc" actions={<Link className="button button--secondary button--md" to="/projects">Thoát xem trước</Link>} />
    <Card className="voice-design-preview__banner" role="note">
      <Badge variant="info">DESIGN PREVIEW</Badge>
      <div><strong>Chỉ dùng để duyệt bố cục trong development.</strong><p>Dữ liệu dưới đây là minh họa giao diện, không đại diện trạng thái Backend và không thể thực hiện TTS.</p></div>
    </Card>
    <div className="voice-heading"><div><span className="voice-label">DỰ ÁN</span><h2>Dự án minh họa</h2></div><Badge variant="info">Chưa xác định</Badge></div>
    <WorkflowSteps workflow={undefined} projectId="design-preview" pageStep="VOICE" />
    <div className="voice-workspace">
      <Card className="voice-summary voice-summary--compact">
        <div><span className="voice-label">Ngôn ngữ thuyết minh</span><h2>Tiếng Anh</h2></div>
        <div><span className="voice-label">Nguồn nội dung</span><p>Bản dịch đã duyệt</p></div>
      </Card>
      <section aria-labelledby="voice-preview-list-heading">
        <div className="voice-toolbar"><h2 id="voice-preview-list-heading">Chọn giọng đọc</h2>
          <div className="voice-filters" role="group" aria-label="Bộ lọc minh họa, không tương tác">
            <Button size="sm" disabled>Tất cả</Button><Button size="sm" variant="secondary" disabled>Nữ</Button><Button size="sm" variant="secondary" disabled>Nam</Button>
          </div>
          <label className="voice-search">Tìm kiếm giọng đọc<input type="search" placeholder="Tìm theo tên" disabled /></label>
        </div>
        <div className="voice-grid">{previewVoices.map((voice, index) => <VoiceCard key={voice.id} voice={voice} selected={index === 0} previewing={false} disabled onPreview={noAction} onSelect={noAction} />)}</div>
      </section>
      <Card className="voice-configuration voice-configuration--preview"><div><h2>Cấu hình giọng đọc</h2><p className="voice-note">Các điều khiển bị khóa trong Design Preview.</p></div>
        <dl><div><dt>Ngôn ngữ</dt><dd>Tiếng Anh</dd></div><div><dt>Giọng đọc</dt><dd>Giọng minh họa A</dd></div><div><dt>Tốc độ</dt><dd>1.0x</dd></div></dl>
        <div className="voice-actions"><Button variant="secondary" disabled>Đặt lại</Button><Button disabled>Tạo giọng đọc</Button><Button variant="secondary" disabled>Tiếp tục tạo thuyết minh</Button></div>
      </Card>
    </div>
  </div>;
}
