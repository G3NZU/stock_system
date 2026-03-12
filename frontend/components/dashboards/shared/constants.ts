/**
 * Shared display constants used across multiple dashboards.
 */

/**
 * Tailwind class strings for enquiry status badge colours.
 * Keys match the `status` values stored in the `enquiries` table.
 */
export const STATUS_COLOURS: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
}
