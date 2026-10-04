import { useCallback, useEffect, useState } from "react";
import {
  api,
  resources,
  resetDemo,
  type Database,
} from "./data";
import {
  AppSidebar,
  AppTopbar,
  HelpGuide,
  WorkspaceContent,
} from "./components";

export default function App() {
  const [data, setData] = useState<Database>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [route, setRoute] = useState(location.hash.slice(1) || "overview");
  const [mobile, setMobile] = useState(false);
  const [help, setHelp] = useState(false);

  const refresh = useCallback(async () => {
    const result = await api.load();
    setData(result);
  }, []);

  useEffect(() => {
    refresh()
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
    const listener = () => {
      setRoute(location.hash.slice(1) || "overview");
      setMobile(false);
    };
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, [refresh]);

  const navigate = (name: string) => {
    location.hash = name;
    setMobile(false);
  };

  const retry = async () => {
    setLoading(true);
    setError("");
    try {
      await refresh();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    try {
      await resetDemo();
      await refresh();
    } catch (e) {
      setError(String(e));
    }
  };

  const resource = resources.find((item) => item.name === route);

  return (
    <div className="app-shell">
      <a
        href="#main"
        className="skip-link"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        Skip to content
      </a>
      <AppSidebar
        route={route}
        data={data}
        mobile={mobile}
        onHelp={() => setHelp(true)}
      />
      {mobile && (
        <button
          className="scrim"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="workspace">
        <AppTopbar
          route={route}
          resource={resource}
          data={data}
          onToggleMobile={() => setMobile(!mobile)}
          onNavigate={navigate}
        />
        <WorkspaceContent
          data={data}
          loading={loading}
          error={error}
          route={route}
          resource={resource}
          onNavigate={navigate}
          onRefresh={refresh}
          onRetry={retry}
          onResetDemo={reset}
        />
      </div>
      <HelpGuide open={help} onClose={() => setHelp(false)} />
    </div>
  );
}
