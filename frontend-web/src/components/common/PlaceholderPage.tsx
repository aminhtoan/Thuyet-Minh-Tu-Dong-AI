import { Card } from './Card'
import { EmptyState } from './EmptyState'
import { PageHeader } from '../layout/PageHeader'

type PlaceholderPageProps = {
  title: string
  description?: string
}

export function PlaceholderPage({ title, description = `${title} will be implemented in a later sprint.` }: PlaceholderPageProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card padding="lg">
        <EmptyState title={`${title} is ready for development`} description="The application shell and reusable UI foundation are in place." />
      </Card>
    </>
  )
}
