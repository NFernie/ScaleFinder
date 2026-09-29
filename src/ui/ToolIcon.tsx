import type { ToolId } from '../core/toolboxSession'

interface Props {
  tool: ToolId
  className?: string
}

export function ToolIcon({ tool, className }: Props) {
  const cn = className ?? 'h-6 w-6'
  switch (tool) {
    case 'polygon':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
          <path d="M5 8 L10 4 L18 6 L20 14 L14 20 L6 17 Z" strokeLinejoin="round" />
        </svg>
      )
    case 'ruler':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
          <path d="M4 18 L20 6" strokeLinecap="round" />
          <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
          <circle cx="20" cy="6" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'lasso':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
          <path
            d="M6 14 C5 9 8 5 12 4 C17 3 20 7 19 11 C18 16 14 19 10 18 C7 17 5 16 6 14"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'circle':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
          <circle cx="12" cy="12" r="8" />
        </svg>
      )
    case 'square':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
          <rect x="5" y="5" width="14" height="14" rx="1" />
        </svg>
      )
  }
}
