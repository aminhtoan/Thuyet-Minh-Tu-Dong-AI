type PlaceholderPageProps = {
  title: string
  message?: string
}

export function PlaceholderPage({
  title,
  message = `${title} screen will be implemented in a later sprint.`,
}: PlaceholderPageProps) {
  return (
    <main className="placeholder-page">
      <h1>{title}</h1>
      <p>{message}</p>
    </main>
  )
}
