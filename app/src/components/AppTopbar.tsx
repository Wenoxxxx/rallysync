import { Bell, ChevronRight, Menu } from "lucide-react";
import { demoMode, type Database, type Resource } from "../data";

type AppTopbarProps = {
  route: string;
  resource?: Resource;
  data: Database;
  onToggleMobile: () => void;
  onNavigate: (name: string) => void;
};

const rows = (data: Database, name: string) => data[name] ?? [];

export default function AppTopbar({
  route,
  resource,
  data,
  onToggleMobile,
  onNavigate,
}: AppTopbarProps) {
  return (
    <header className="topbar">
      <button
        className="icon-button mobile-toggle"
        aria-label="Open navigation"
        onClick={onToggleMobile}
      >
        <Menu size={22} />
      </button>
      <div className="breadcrumb">
        Workspace <ChevronRight size={13} />
        <strong>
          {resource?.label ??
            (route === "competition" ? "Brackets & scoring" : "Overview")}
        </strong>
      </div>
      <div className="topbar-actions">
        <span className="environment">{demoMode ? "DEMO MODE" : "API MODE"}</span>
        <button
          className="icon-button"
          aria-label="Notifications"
          onClick={() => onNavigate("notifications")}
        >
          <Bell size={19} />
          {rows(data, "notification_recipients").some(
            (row) => !row.read_at,
          ) && <i className="notification-dot" />}
        </button>
        <span className="avatar">RS</span>
      </div>
    </header>
  );
}
