/** Curated editorial content only. Never populate this from private projects/results. */
export type MuseumPublicImage = {
  src: string
  alt: string
  caption: string
  credit: string
}

export type MuseumExhibition = {
  slug: string
  title: string
  summary: string
  sections: readonly { heading: string; paragraphs: readonly string[] }[]
  source: { label: string; reference: string; verifiedOn: string }
  publication: 'draft' | 'ready'
  image?: MuseumPublicImage
}

// Empty until verified content and publication review are supplied.
// `ready` records a website editorial decision, not museum endorsement.
export const museumExhibitions: readonly MuseumExhibition[] = []

export function isMuseumPublicImage(image: MuseumPublicImage | undefined): image is MuseumPublicImage {
  return Boolean(image && /^\/(?:museum\/images|museum-media)\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:avif|webp|png|jpe?g)$/.test(image.src)
    && image.alt.trim() && image.caption.trim() && image.credit.trim())
}

export function getPublishedExhibitions(catalog: readonly MuseumExhibition[] = museumExhibitions) {
  return catalog.filter((entry) => entry.publication === 'ready'
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug)
    && catalog.filter((candidate) => candidate.slug === entry.slug).length === 1
    && entry.title.trim() && entry.summary.trim()
    && entry.source.label.trim() && entry.source.reference.trim()
    && /^\d{4}-\d{2}-\d{2}$/.test(entry.source.verifiedOn)
    && entry.sections.length > 0
    && entry.sections.every((section) => section.heading.trim()
      && section.paragraphs.length > 0 && section.paragraphs.every((paragraph) => paragraph.trim())))
}
