import { displayStatusLabels } from '../localization/statusLabels.mjs'

export function getDisplayStatus(status: string): string {
  return displayStatusLabels[status] ?? status
}
