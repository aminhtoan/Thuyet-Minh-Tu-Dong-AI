import type { Project, ProjectStatus } from './types'

export function isProjectDemoEnabled(development: boolean, flag: unknown) {
  return development === true && flag === 'true'
}
// UI-only statuses: no media URLs, transcripts, translations or output artifacts.
export function createDemoProjects(now = new Date()): Project[] {
  const names = ['Mùa thu Hà Nội', 'Da Nang Travel', 'Giới thiệu sản phẩm', 'mua', 'Hành trình khám phá văn hóa và ẩm thực Việt Nam dành cho du khách quốc tế', 'An Giang', 'Bài học đầu tiên', 'Bao ve moi truong', 'Du lịch miền Tây', 'Câu chuyện hôm nay', 'Huong dan su dung', 'Khám phá thiên nhiên', 'Video khóa học', 'Nghệ thuật kể chuyện', 'Công ty của tôi', 'Am thanh', 'Chuyến đi cuối tuần', 'Tài liệu tháng trước', 'Dự án đầu năm', 'Kỷ niệm năm ngoái']
  const statuses: ProjectStatus[] = ['DRAFT', 'DRAFT', 'DRAFT', 'DRAFT', 'UPLOADED', 'UPLOADED', 'UPLOADED', 'TRANSCRIBING', 'TRANSLATING', 'GENERATING_AUDIO', 'PROCESSING_VIDEO', 'TRANSCRIBING', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'FAILED', 'FAILED']
  return names.map((name, index) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9)
    if (index < 7) date.setDate(date.getDate() - index)
    else if (index < 12) date.setDate(1)
    else date.setMonth(date.getMonth() - (index - 11), 1)
    return { id: `ui-demo-project-${index + 1}`, name, description: 'Dữ liệu demo chỉ dùng để kiểm tra giao diện.', sourceLanguage: ['vi', 'en', 'ja', 'ko'][index % 4]!, status: statuses[index]!, createdAt: date.toISOString(), updatedAt: date.toISOString() }
  })
}
