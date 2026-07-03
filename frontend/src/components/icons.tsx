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
