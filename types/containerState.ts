export type ContainerState =
  | 'full'
  | 'dirty'
  | 'damaged'
  | 'for-collection'
  | 'maintenance'
  | 'fallen'

export const CONTAINER_STATES: ContainerState[] = [
  'full',
  'dirty',
  'damaged',
  'for-collection',
  'maintenance',
  'fallen',
]

export function getStateColor(state: ContainerState | string): string {
  switch (state) {
    case 'full':
      return '#DC2626' // Red
    case 'dirty':
      return '#92400E' // Brown
    case 'damaged':
      return '#1F2937' // Black/Dark Gray
    case 'for-collection':
      return '#3B82F6' // Blue
    case 'maintenance':
      return '#F97316' // Orange
    case 'fallen':
      return '#7C3AED' // Purple
    default:
      return '#1E40AF' // Default Blue
  }
}
