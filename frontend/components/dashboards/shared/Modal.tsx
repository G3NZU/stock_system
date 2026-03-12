/**
 * Shared modal overlay component used across all dashboards.
 *
 * Renders a centered dialog with a header (title + close button) and a scrollable body.
 * The `size` prop controls the maximum width – use 'lg' for narrow forms (default) and
 * '2xl' for wider content such as inventory tables.
 */

type ModalSize = 'lg' | '2xl'

const SIZE_CLASSES: Record<ModalSize, string> = {
  lg: 'max-w-lg',
  '2xl': 'max-w-2xl',
}

export function Modal({
  title,
  onClose,
  size = 'lg',
  children,
}: {
  title: string
  onClose: () => void
  /** Controls the maximum width of the dialog. Defaults to 'lg'. */
  size?: ModalSize
  children: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className={`bg-white rounded-xl shadow-2xl w-full ${SIZE_CLASSES[size]} max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}
