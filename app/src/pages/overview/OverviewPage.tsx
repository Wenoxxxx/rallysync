import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Plus,
  Trophy,
  Users,
} from "lucide-react";
import { type Database, type Row } from "../../data";

const rows = (data: Database, name: string) => data[name] ?? [];
const label = (row: Row) =>
  String(
    row.name ??
      row.entry_name ??
      row.court_name ??
      row.role_name ??
      row.permission_name ??
      row.format_name ??
      row.title ??
      (row.first_name
        ? `${row.first_name} ${row.last_name}`
        : (row.email ?? Object.values(row)[0] ?? "")),
  );
const title = (text: string) =>
  text.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
function Badge({ value }: { value: unknown }) {
  return (
    <span className={`badge ${String(value)}`}>{title(String(value))}</span>
  );
}
export function Dashboard({
  data,
  navigate,
}: {
  data: Database;
  navigate: (s: string) => void;
}) {
  const tournaments = rows(data, "tournaments");
  const pending = rows(data, "registrations").filter(
    (r) => r.status === "pending",
  );
  const matches = rows(data, "matches");
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR TOURNAMENT COMMAND CENTER</span>
          <h1>Every rally. In sync.</h1>
          <p>
            A clear view of your tournaments, from the first entry to the final
            point.
          </p>
        </div>
        <button className="button" onClick={() => navigate("tournaments")}>
          <Plus size={17} />
          Manage tournaments
        </button>
      </div>
      <div className="stats">
        {[
          [
            Trophy,
            "Active tournaments",
            tournaments.filter(
              (r) =>
                !["archived", "completed", "cancelled"].includes(
                  String(r.status),
                ),
            ).length,
            "Ready for the next rally",
          ],
          [
            Users,
            "Registered players",
            rows(data, "player_profiles").length,
            "Across your workspace",
          ],
          [
            ClipboardList,
            "Pending registrations",
            pending.length,
            "Waiting for your review",
          ],
          [
            Activity,
            "Matches in progress",
            matches.filter((r) => r.status === "in_progress").length,
            `${matches.filter((r) => r.status === "completed").length} matches completed`,
          ],
        ].map(([Icon, name, count, note], i) => {
          const C = Icon as typeof Trophy;
          return (
            <section className="stat" key={i}>
              <div className="stat-label">
                {String(name)}
                <C size={18} />
              </div>
              <strong>{String(count).padStart(2, "0")}</strong>
              <span>{String(note)}</span>
            </section>
          );
        })}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="section-title">
            <h2>Tournament activity</h2>
            <button
              className="text-button"
              onClick={() => navigate("tournaments")}
            >
              View all <ArrowRight size={15} />
            </button>
          </div>
          {tournaments.length ? (
            tournaments.map((t) => (
              <button
                className="tournament-card"
                key={String(t.tournament_id)}
                onClick={() => navigate("events")}
              >
                <div className="tournament-monogram">
                  <Trophy size={25} />
                </div>
                <div className="tournament-info">
                  <h3>{String(t.name)}</h3>
                  <p>
                    <CalendarDays size={13} />{" "}
                    {new Date(String(t.starts_at)).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    <span>·</span>
                    {label(
                      rows(data, "venues").find(
                        (v) => v.venue_id === t.venue_id,
                      ) ?? { name: "Venue not assigned" },
                    )}
                  </p>
                  <div className="tournament-meta">
                    <Badge value={t.status} />
                    <span>
                      {
                        rows(data, "events").filter(
                          (e) => e.tournament_id === t.tournament_id,
                        ).length
                      }{" "}
                      events
                    </span>
                    <span>
                      {
                        rows(data, "registrations").filter(
                          (e) => e.tournament_id === t.tournament_id,
                        ).length
                      }{" "}
                      registrations
                    </span>
                  </div>
                </div>
                <ChevronRight size={18} />
              </button>
            ))
          ) : (
            <div className="empty">Create your first tournament to begin.</div>
          )}
        </section>
        <section className="action-panel">
          <span className="eyebrow">UP NEXT</span>
          <h2>
            Keep the game
            <br />
            moving.
          </h2>
          <p>
            {pending.length
              ? `${pending.length} registrations are waiting for a decision. Review entries before you prepare the draw.`
              : "Your registration queue is clear. Set up your next draw or check the match schedule."}
          </p>
          <button
            className="button light"
            onClick={() =>
              navigate(pending.length ? "registrations" : "competition")
            }
          >
            {pending.length ? "Review registrations" : "Open competition"}
            <ArrowRight size={16} />
          </button>
          <div className="court-art" aria-hidden="true">
            <div />
            <div />
          </div>
        </section>
        <section className="panel">
          <div className="section-title">
            <h2>Upcoming court sessions</h2>
            <button
              className="text-button"
              onClick={() => navigate("match_schedules")}
            >
              Full schedule <ArrowRight size={15} />
            </button>
          </div>
          {rows(data, "match_schedules")
            .filter((s) => ["scheduled", "published"].includes(String(s.status)))
            .sort((a, b) =>
              String(a.scheduled_start).localeCompare(
                String(b.scheduled_start),
              ),
            )
            .slice(0, 5)
            .map((s) => (
              <div className="schedule-row" key={String(s.schedule_id)}>
                <span className="schedule-time">
                  {new Date(String(s.scheduled_start)).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  <small>
                    {new Date(String(s.scheduled_start)).toLocaleDateString(
                      [],
                      { month: "short", day: "numeric" },
                    )}
                  </small>
                </span>
                <div>
                  <strong>Match {String(s.match_id)}</strong>
                  <p>
                    {label(
                      rows(data, "courts").find(
                        (c) => c.court_id === s.court_id,
                      ) ?? { name: "Court to be assigned" },
                    )}
                  </p>
                </div>
                <Badge value={s.status} />
              </div>
            ))}
          {!rows(data, "match_schedules").some((s) => ["scheduled", "published"].includes(String(s.status))) && (
            <p className="empty">No upcoming matches scheduled.</p>
          )}
        </section>
        <section className="panel">
          <div className="section-title">
            <h2>Workspace checklist</h2>
            <span className="muted">GET MATCH-READY</span>
          </div>
          {[
            ["Create a tournament", "tournaments", tournaments.length],
            [
              "Configure events & divisions",
              "events",
              rows(data, "events").length,
            ],
            [
              "Review participant entries",
              "registrations",
              rows(data, "entries").length,
            ],
            [
              "Prepare brackets & matches",
              "competition",
              rows(data, "brackets").length,
            ],
            [
              "Assign courts & officials",
              "official_assignments",
              rows(data, "official_assignments").length,
            ],
          ].map(([text, page, count]) => (
            <button
              className="checklist-row"
              key={String(page)}
              onClick={() => navigate(String(page))}
            >
              <span className={`check-circle ${count ? "checked" : ""}`}>
                {count ? <Check size={13} /> : null}
              </span>
              <span>{String(text)}</span>
              <ChevronRight size={15} />
            </button>
          ))}
        </section>
      </div>
    </>
  );
}
export default Dashboard;