type IconProps = React.SVGProps<SVGSVGElement>;

function base(props: IconProps) {
  return {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

export const IconStack = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3 21 7.5 12 12 3 7.5 12 3Z" />
    <path d="M3 12.5 12 17l9-4.5" />
    <path d="M3 17 12 21.5 21 17" />
  </svg>
);

export const IconSpatial = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="3" width="7" height="6" rx="1.2" />
    <rect x="14" y="4" width="7" height="9" rx="1.2" />
    <rect x="4" y="13" width="8" height="8" rx="1.2" />
    <rect x="15" y="16" width="6" height="5" rx="1.2" />
  </svg>
);

export const IconGrid = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
    <rect x="13.5" y="13.5" width="7" height="7" rx="1" />
  </svg>
);

export const IconExpand = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9 4H4v5M20 9V4h-5M15 20h5v-5M4 15v5h5" />
  </svg>
);

export const IconClose = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 6 18 18M18 6 6 18" />
  </svg>
);

export const IconShare = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="18" cy="5" r="2.4" />
    <circle cx="6" cy="12" r="2.4" />
    <circle cx="18" cy="19" r="2.4" />
    <path d="M8.1 10.9 15.9 6.3M8.1 13.1l7.8 4.6" />
  </svg>
);

export const IconDownload = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3v12M7 10l5 5 5-5" />
    <path d="M4 19.5h16" />
  </svg>
);

export const IconBookmark = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 3.8h12c.55 0 1 .45 1 1V21l-7-4-7 4V4.8c0-.55.45-1 1-1Z" />
  </svg>
);

export const IconBookmarkFilled = (p: IconProps) => (
  <svg {...base({ ...p, fill: "currentColor" })}>
    <path d="M6 3.8h12c.55 0 1 .45 1 1V21l-7-4-7 4V4.8c0-.55.45-1 1-1Z" />
  </svg>
);

export const IconArrow = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

export const IconPlus = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconMinus = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12h14" />
  </svg>
);

export const IconChevron = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 9.5 12 15l6-5.5" />
  </svg>
);

export const IconAlbums = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="6.5" width="13" height="13" rx="1.6" />
    <path d="M7 4.2h10.5c.7 0 1.3.6 1.3 1.3V16" />
  </svg>
);

export const IconCheck = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12.5 10 17l9-10" />
  </svg>
);

export const IconReframe = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 9V5.5C4 4.7 4.7 4 5.5 4H9M15 4h3.5c.8 0 1.5.7 1.5 1.5V9M20 15v3.5c0 .8-.7 1.5-1.5 1.5H15M9 20H5.5C4.7 20 4 19.3 4 18.5V15" />
  </svg>
);
