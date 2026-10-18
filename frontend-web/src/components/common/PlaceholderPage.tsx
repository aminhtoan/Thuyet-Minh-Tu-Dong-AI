import { Card } from './Card'
import { EmptyState } from './EmptyState'
import { PageHeader } from '../layout/PageHeader'

type PlaceholderPageProps = {
  title: string
  description?: string
}

export function PlaceholderPage({ title, description = `${title} sẽ được hoàn thiện trong giai đoạn tiếp theo.` }: PlaceholderPageProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card padding="lg">
        <EmptyState title={`${title} đang được hoàn thiện`} description="Khung ứng dụng và nền tảng giao diện dùng chung đã sẵn sàng." />
      </Card>
    </>
  )
}
