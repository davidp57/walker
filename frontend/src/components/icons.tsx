import type { CSSProperties } from 'react'

interface IconProps {
  size?: number
  style?: CSSProperties
  className?: string
}
const base = (size: number): CSSProperties => ({ width: size, height: size, display: 'block' })

export const IconTracker = ({ size = 15, style, className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    style={{ ...base(size), ...style }}
    className={className}
    aria-hidden
  >
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
    <path d="M10 8.5 15.5 12 10 15.5V8.5Z" fill="currentColor" />
  </svg>
)

export const IconFortnight = ({ size = 15, style, className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    style={{ ...base(size), ...style }}
    className={className}
    aria-hidden
  >
    <rect x="3.5" y="4.5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.7" />
    <path d="M3.5 9h17M9 9v10.5M14.5 9v10.5" stroke="currentColor" strokeWidth="1.4" />
  </svg>
)

export const IconChecklist = ({ size = 15, style, className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    style={{ ...base(size), ...style }}
    className={className}
    aria-hidden
  >
    <path
      d="M4 12.5 8 16.5 20 5"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const IconCatalog = ({ size = 15, style, className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    style={{ ...base(size), ...style }}
    className={className}
    aria-hidden
  >
    <path
      d="M6 4.5h10a2 2 0 0 1 2 2v13l-7-3-7 3v-13a2 2 0 0 1 2-2Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  </svg>
)

/** Bulleted-list-with-checkbox glyph for the Tasks nav item — distinct from the Entry checklist. */
export const IconTasks = ({ size = 15, style, className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    style={{ ...base(size), ...style }}
    className={className}
    aria-hidden
  >
    <rect x="3.5" y="4.5" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M4.7 7 6 8.3 7.8 6"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect x="3.5" y="14.5" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M11.5 7h9M11.5 17h9M11.5 12h6"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  </svg>
)

export const IconSettings = ({ size = 15, style, className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    style={{ ...base(size), ...style }}
    className={className}
    aria-hidden
  >
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
    <path
      d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8M18.4 18.4l-1.8-1.8M7.4 7.4 5.6 5.6"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
)

/** Sheriff-star app mark — the western wink. Simple 5-point star. */
export const IconStar = ({ size = 16, style, className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ ...base(size), ...style }}
    className={className}
    aria-hidden
  >
    <path d="M12 2.2l2.7 5.9 6.5.7-4.8 4.4 1.3 6.4L12 16.9 6.3 20l1.3-6.4L2.8 9.2l6.5-.7L12 2.2Z" />
  </svg>
)

export const IconPlay = ({ size = 13, style, className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ ...base(size), ...style }}
    className={className}
    aria-hidden
  >
    <path d="M7 5v14l11-7L7 5Z" />
  </svg>
)

export const IconStop = ({ size = 13, style, className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ ...base(size), ...style }}
    className={className}
    aria-hidden
  >
    <rect x="6" y="6" width="12" height="12" rx="1.5" />
  </svg>
)

/** Pencil glyph for "edit entry" row actions — clearer than the generic ✎ character. */
export const IconEdit = ({ size = 14, style, className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    style={{ ...base(size), ...style }}
    className={className}
    aria-hidden
  >
    <path
      d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7.5 18.5 3 20l1.5-4.5L16.5 3.5Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

/** Trash-can glyph for "delete entry" row actions — clearer than the generic ✕ character. */
export const IconTrash = ({ size = 14, style, className }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    style={{ ...base(size), ...style }}
    className={className}
    aria-hidden
  >
    <path
      d="M4.5 7h15M9.5 7V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v2M7 7l1 12.5a1.5 1.5 0 0 0 1.5 1.4h5a1.5 1.5 0 0 0 1.5-1.4L18 7"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)
