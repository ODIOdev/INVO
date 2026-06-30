import type { AdminIconName } from "@/lib/admin-icons";

type AdminIconProps = {
  name: AdminIconName;
  className?: string;
  size?: number;
};

type SvgProps = {
  className: string;
  size: number;
};

function Svg({ className, size, children }: SvgProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export default function AdminIcon({
  name,
  className = "",
  size = 18,
}: AdminIconProps) {
  const cn = `shrink-0 ${className}`;

  switch (name) {
    case "home":
      return (
        <Svg className={cn} size={size}>
          <path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z" />
        </Svg>
      );
    case "clients":
      return (
        <Svg className={cn} size={size}>
          <path d="M20 21a8 8 0 0 0-16 0" />
          <circle cx="12" cy="7" r="4" />
        </Svg>
      );
    case "documents":
      return (
        <Svg className={cn} size={size}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
        </Svg>
      );
    case "quotes":
      return (
        <Svg className={cn} size={size}>
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z" />
          <path d="M8 12h8M8 16h6" />
        </Svg>
      );
    case "drafts":
      return (
        <Svg className={cn} size={size}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </Svg>
      );
    case "lineItems":
      return (
        <Svg className={cn} size={size}>
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </Svg>
      );
    case "labor":
      return (
        <Svg className={cn} size={size}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </Svg>
      );
    case "notes":
      return (
        <Svg className={cn} size={size}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </Svg>
      );
    case "integrations":
      return (
        <Svg className={cn} size={size}>
          <path d="M12 22v-5" />
          <path d="M9 8V2" />
          <path d="M15 8V2" />
          <path d="M18 8v5a6 6 0 0 1-12 0V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2z" />
        </Svg>
      );
    case "settings":
      return (
        <Svg className={cn} size={size}>
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </Svg>
      );
    case "folder-open":
      return (
        <Svg className={cn} size={size}>
          <path d="M6 14h12l-1 4H7l-1-4z" />
          <path d="M4 10h16l-1 4H5l-1-4z" />
          <path d="M2 6h7l2 3h11v1H2V6z" />
        </Svg>
      );
    case "check-circle":
      return (
        <Svg className={cn} size={size}>
          <circle cx="12" cy="12" r="10" />
          <path d="m9 12 2 2 4-4" />
        </Svg>
      );
    case "clock":
      return (
        <Svg className={cn} size={size}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </Svg>
      );
    case "user-plus":
      return (
        <Svg className={cn} size={size}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M19 8v6M22 11h-6" />
        </Svg>
      );
    case "pencil":
      return (
        <Svg className={cn} size={size}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </Svg>
      );
    case "trash":
      return (
        <Svg className={cn} size={size}>
          <path d="M3 6h18" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          <path d="M10 11v6M14 11v6" />
        </Svg>
      );
    case "chevron-down":
      return (
        <Svg className={cn} size={size}>
          <path d="m6 9 6 6 6-6" />
        </Svg>
      );
    case "chevron-left":
      return (
        <Svg className={cn} size={size}>
          <path d="m15 18-6-6 6-6" />
        </Svg>
      );
    case "chevron-right":
      return (
        <Svg className={cn} size={size}>
          <path d="m9 18 6-6-6-6" />
        </Svg>
      );
    case "cloud":
      return (
        <Svg className={cn} size={size}>
          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z" />
        </Svg>
      );
    case "mail":
      return (
        <Svg className={cn} size={size}>
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </Svg>
      );
    case "credit-card":
      return (
        <Svg className={cn} size={size}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M2 10h20" />
        </Svg>
      );
    case "eye":
      return (
        <Svg className={cn} size={size}>
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </Svg>
      );
    case "eye-off":
      return (
        <Svg className={cn} size={size}>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19" />
          <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
          <path d="M1 1l22 22" />
        </Svg>
      );
    default:
      return (
        <Svg className={cn} size={size}>
          <circle cx="12" cy="12" r="10" />
        </Svg>
      );
  }
}
