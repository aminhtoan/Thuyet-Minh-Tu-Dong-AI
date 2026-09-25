import { Link } from 'react-router-dom'
import { Card } from '../components/common/Card'
import { EmptyState } from '../components/common/EmptyState'
import { PageHeader } from '../components/layout/PageHeader'

export function NewProjectPlaceholder() {
  return <><PageHeader title="Create New Project" description="Start by uploading a video or audio file." /><Card padding="lg"><EmptyState title="Media upload is coming next" description="The upload workflow will be implemented in S5." action={<Link className="button button--secondary button--md" to="/projects">Back to Projects</Link>} /></Card></>
}
