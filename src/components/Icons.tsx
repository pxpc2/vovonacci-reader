// Minimal inline SVG icons — stroke inherits currentColor, sized via font-size/em.
interface IP {
  size?: number;
}
const base = (size = 16) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const IconOpen = ({ size }: IP) => (
  <svg {...base(size)}>
    <path d="M3 7h6l2 2h10v9a2 2 0 0 1-2 2H3z" />
    <path d="M3 7V5a2 2 0 0 1 2-2h4l2 2" />
  </svg>
);
export const IconSidebar = ({ size }: IP) => (
  <svg {...base(size)}>
    <rect x="3" y="4" width="18" height="16" rx="1.5" />
    <line x1="9" y1="4" x2="9" y2="20" />
  </svg>
);
export const IconChevronUp = ({ size }: IP) => (
  <svg {...base(size)}>
    <polyline points="6 15 12 9 18 15" />
  </svg>
);
export const IconChevronDown = ({ size }: IP) => (
  <svg {...base(size)}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
export const IconChevronRight = ({ size }: IP) => (
  <svg {...base(size)}>
    <polyline points="9 6 15 12 9 18" />
  </svg>
);
export const IconZoomIn = ({ size }: IP) => (
  <svg {...base(size)}>
    <circle cx="11" cy="11" r="7" />
    <line x1="16.5" y1="16.5" x2="21" y2="21" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);
export const IconZoomOut = ({ size }: IP) => (
  <svg {...base(size)}>
    <circle cx="11" cy="11" r="7" />
    <line x1="16.5" y1="16.5" x2="21" y2="21" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);
export const IconFitWidth = ({ size }: IP) => (
  <svg {...base(size)}>
    <rect x="4" y="6" width="16" height="12" rx="1.5" />
    <polyline points="8 9 5 12 8 15" />
    <polyline points="16 9 19 12 16 15" />
  </svg>
);
export const IconFitPage = ({ size }: IP) => (
  <svg {...base(size)}>
    <rect x="6" y="4" width="12" height="16" rx="1.5" />
    <polyline points="9 8 12 5 15 8" />
    <polyline points="9 16 12 19 15 16" />
  </svg>
);
export const IconRotate = ({ size }: IP) => (
  <svg {...base(size)}>
    <path d="M21 12a9 9 0 1 1-3-6.7" />
    <polyline points="21 3 21 8 16 8" />
  </svg>
);
export const IconSearch = ({ size }: IP) => (
  <svg {...base(size)}>
    <circle cx="11" cy="11" r="7" />
    <line x1="16.5" y1="16.5" x2="21" y2="21" />
  </svg>
);
export const IconClose = ({ size }: IP) => (
  <svg {...base(size)}>
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </svg>
);
export const IconPrint = ({ size }: IP) => (
  <svg {...base(size)}>
    <polyline points="6 9 6 3 18 3 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="7" rx="1" />
  </svg>
);
