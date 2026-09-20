import { Settings } from 'lucide-react'

export const Icon = {
  Chevron: () => (
    <svg
      className="chev"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 4 10 8 6 12" />
    </svg>
  ),
  Edit: () => (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.5 2.5l3 3L5 14l-3.6.6L2 11l8.5-8.5z" />
      <path d="M9 4l3 3" />
    </svg>
  ),
  Home: () => (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 7l6-5 6 5v6.5a1 1 0 0 1-1 1h-2.5v-4h-5v4H3a1 1 0 0 1-1-1V7z" />
    </svg>
  ),
  Gear: () => <Settings size={16} strokeWidth={1.7} aria-hidden="true" />,
  Filter: () => (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 4h12M4 8h8M6 12h4" />
    </svg>
  ),
  Book: () => (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 3.5h5a2 2 0 0 1 2 2v8a1.5 1.5 0 0 0-1.5-1.5H2z M14 3.5H9a2 2 0 0 0-2 2v8a1.5 1.5 0 0 1 1.5-1.5H14z" />
    </svg>
  ),
  Inbox: () => (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 8h3.2l1.1 2.4h3.4L10.8 8H14M2 8V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v4M2 8v4a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8" />
    </svg>
  ),
  Star: () => (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 1.6l1.9 4.2 4.5.5-3.4 3.1.9 4.5L8 11.7l-3.9 2.2.9-4.5-3.4-3.1 4.5-.5z" />
    </svg>
  ),
  GreyZone: () => (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6" />
      <path d="M8 2a6 6 0 0 1 0 12z" fill="currentColor" stroke="none" />
    </svg>
  ),
  Plus: () => (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="8" y1="3" x2="8" y2="13" />
      <line x1="3" y1="8" x2="13" y2="8" />
    </svg>
  ),
  Trash: () => (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 4.5h10M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M6.5 7.5v4M9.5 7.5v4M4 4.5l.6 8.1a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9l.6-8.1" />
    </svg>
  ),
}
