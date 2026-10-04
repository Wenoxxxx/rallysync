import { demoMode, type Database, type Resource } from "../data";
import CompetitionPage from "../pages/competition/CompetitionPage";
import OverviewPage from "../pages/overview/OverviewPage";
import RecordsPage from "../pages/records/RecordsPage";
import DemoNotice from "./DemoNotice";

type WorkspaceContentProps = {
  data: Database;
  loading: boolean;
  error: string;
  route: string;
  resource?: Resource;
  onNavigate: (name: string) => void;
  onRefresh: () => Promise<void>;
  onRetry: () => Promise<void>;
  onResetDemo: () => Promise<void>;
};

export default function WorkspaceContent({
  data,
  loading,
  error,
  route,
  resource,
  onNavigate,
  onRefresh,
  onRetry,
  onResetDemo,
}: WorkspaceContentProps) {
  return (
    <main id="main" tabIndex={-1}>
      {demoMode && <DemoNotice onReset={onResetDemo} />}
      {loading ? (
        <div className="empty" role="status">
          Loading workspace…
        </div>
      ) : error ? (
        <div className="panel error" role="alert">
          <h2>Unable to load workspace</h2>
          <p>{error}</p>
          <button className="button" onClick={onRetry}>
            Retry connection
          </button>
        </div>
      ) : route === "overview" ? (
        <OverviewPage data={data} navigate={onNavigate} />
      ) : route === "competition" ? (
        <CompetitionPage data={data} onChange={onRefresh} />
      ) : resource ? (
        <RecordsPage
          key={resource.name}
          resource={resource}
          data={data}
          refresh={onRefresh}
        />
      ) : (
        <div className="empty">
          <h1>Page not found</h1>
          <button className="button" onClick={() => onNavigate("overview")}>
            Back to overview
          </button>
        </div>
      )}
      <footer className="page-footer">
        <span>RallySync / Badminton Tournament Management</span>
        <span>Built for every point.</span>
      </footer>
    </main>
  );
}
