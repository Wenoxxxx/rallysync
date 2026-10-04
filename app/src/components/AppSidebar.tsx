import {
  Activity,
  CalendarDays,
  CircleHelp,
  ClipboardList,
  LayoutDashboard,
  Settings2,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { demoMode, resources, type Database } from "../data";

type AppSidebarProps = {
  route: string;
  data: Database;
  mobile: boolean;
  onHelp: () => void;
};

const primaryNav = [
  ["overview", "Overview", LayoutDashboard],
  ["tournaments", "Tournaments", Trophy],
  ["registrations", "Registrations", ClipboardList],
  ["player_profiles", "Players", Users],
  ["competition", "Brackets & scoring", Activity],
  ["match_schedules", "Schedule & courts", CalendarDays],
  ["event_results", "Results", ShieldCheck],
] as const;

const rows = (data: Database, name: string) => data[name] ?? [];

export default function AppSidebar({
  route,
  data,
  mobile,
  onHelp,
}: AppSidebarProps) {
  const groups = [...new Set(resources.map((resource) => resource.group))];

  return (
    <aside className={`sidebar ${mobile ? "open" : ""}`}>
      <a href="#overview" className="brand">
        <span className="brand-icon">
          <Activity size={23} />
        </span>
        rally<span>sync</span>
        <i>BTMS</i>
      </a>
      <div className="workspace-label">
        <span className="workspace-avatar">RS</span>
        <div>
          <strong>Tournament workspace</strong>
          <small>Badminton operations</small>
        </div>
      </div>
      <span className="nav-label">WORKSPACE</span>
      <nav aria-label="Main navigation">
        {primaryNav.map(([id, name, Icon]) => (
          <a
            key={id}
            href={`#${id}`}
            className={route === id ? "active" : ""}
            aria-current={route === id ? "page" : undefined}
          >
            <Icon size={18} />
            {name}
            {id === "registrations" &&
              rows(data, "registrations").some((row) => row.status === "pending") && (
                <span className="nav-count">
                  {
                    rows(data, "registrations").filter(
                      (row) => row.status === "pending",
                    ).length
                  }
                </span>
              )}
          </a>
        ))}
      </nav>
      <span className="nav-label">DATA & ADMINISTRATION</span>
      <nav aria-label="Resource navigation">
        {groups.map((group) => (
          <details key={group}>
            <summary>
              <Settings2 size={15} />
              {group}
            </summary>
            {resources
              .filter((resource) => resource.group === group)
              .map((resource) => (
                <a
                  key={resource.name}
                  href={`#${resource.name}`}
                  className={
                    route === resource.name ? "active sub-link" : "sub-link"
                  }
                >
                  {resource.label}
                </a>
              ))}
          </details>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button onClick={onHelp}>
          <CircleHelp size={18} />
          Workspace guide
        </button>
        <div className="mode-indicator">
          <span />
          {demoMode ? "Local demo workspace" : "Connected API workspace"}
        </div>
      </div>
    </aside>
  );
}
