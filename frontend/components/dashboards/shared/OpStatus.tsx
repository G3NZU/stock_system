/**
 * Inline feedback banner displayed inside modals after an operation.
 *
 * Shows a red error banner when `error` is non-empty, or a green success banner
 * when `success` is non-empty. Both banners are hidden when their prop is an
 * empty string.
 */
export function OpStatus({ error, success }: { error: string; success: string }) {
  return (
    <>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-300 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-300 text-green-700 rounded-lg text-sm">
          {success}
        </div>
      )}
    </>
  )
}
