import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ArrowDownToLine,
  ClipboardList,
  Plus,
  Search,
  X,
} from "lucide-react";
import {
  api,
  resources,
  type Database,
  type Row,
} from "../../data";

type Resource = (typeof resources)[number];
const title = (text: string) =>
  text.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
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
function displayValue(
  data: Database,
  resource: Resource,
  name: string,
  value: Row[string],
) {
  if (value == null || value === "") return "—";
  const field = resource.fields.find((f) => f.name === name);
  if (field?.ref) {
    const target = resources.find((r) => r.name === field.ref);
    const found = rows(data, field.ref).find(
      (r) => String(r[target?.key[0] ?? "id"]) === String(value),
    );
    return found ? label(found) : String(value);
  }
  if (field?.type === "datetime-local")
    return new Date(String(value)).toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });
  return String(value);
}
function Badge({ value }: { value: unknown }) {
  return (
    <span className={`badge ${String(value)}`}>{title(String(value))}</span>
  );
}
function csvDownload(resource: Resource, data: Row[]) {
  const columns = resource.fields.map((f) => f.name);
  const cell = (v: unknown) =>
    `"${String(v ?? "")
      .replace(/^[=+@-]/, "'$&")
      .replaceAll('"', '""')}"`;
  const blob = new Blob(
    [
      "\uFEFF" +
        [
          columns.map(cell).join(","),
          ...data.map((r) => columns.map((c) => cell(r[c])).join(",")),
        ].join("\r\n"),
    ],
    { type: "text/csv;charset=utf-8" },
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${resource.name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
function Editor({
  resource,
  original,
  data,
  onClose,
  onSaved,
}: {
  resource: Resource;
  original?: Row;
  data: Database;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const fields = resource.fields.filter(
    (f) => !f.readOnly && !(original && resource.key.includes(f.name)),
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const value: Row = { ...original };
    for (const field of fields) {
      const raw = String(form.get(field.name) ?? "").trim();
      value[field.name] =
        raw === ""
          ? null
          : field.type === "number"
            ? Number(raw)
            : field.type === "datetime-local"
              ? new Date(raw).toISOString()
              : raw;
    }
    try {
      await api.save(resource.name, value, original);
      await onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="editor"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      aria-labelledby="editor-title"
    >
      <form onSubmit={submit}>
        <header>
          <div>
            <span className="eyebrow">WORKSPACE RECORD</span>
            <h2 id="editor-title">
              {original ? "Edit" : "Create"} {resource.label}
            </h2>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="Close editor"
            disabled={busy}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        <div className="form-grid">
          {fields.map((field) => {
            let defaultValue = String(original?.[field.name] ?? "");
            if (field.type === "datetime-local" && defaultValue) {
              const date = new Date(defaultValue);
              defaultValue = new Date(
                date.getTime() - date.getTimezoneOffset() * 60000,
              )
                .toISOString()
                .slice(0, 16);
            }
            const target = resources.find((r) => r.name === field.ref);
            return (
              <label
                className={`field ${field.type === "textarea" ? "wide" : ""}`}
                key={field.name}
              >
                {field.label}
                {field.required && <span className="required"> *</span>}
                {field.ref || field.options ? (
                  <select
                    name={field.name}
                    required={field.required}
                    defaultValue={defaultValue}
                  >
                    <option value="">Select {field.label.toLowerCase()}</option>
                    {field.ref
                      ? rows(data, field.ref).map((r, i) => (
                          <option
                            key={i}
                            value={String(r[target?.key[0] ?? "id"])}
                          >
                            {label(r)}
                          </option>
                        ))
                      : field.options?.map((o) => (
                          <option key={o} value={o}>
                            {title(o)}
                          </option>
                        ))}
                  </select>
                ) : field.type === "textarea" ? (
                  <textarea
                    name={field.name}
                    defaultValue={defaultValue}
                    required={field.required}
                    rows={3}
                  />
                ) : (
                  <input
                    name={field.name}
                    type={field.type}
                    defaultValue={defaultValue}
                    required={field.required}
                    step={field.type === "number" ? "any" : undefined}
                  />
                )}
              </label>
            );
          })}
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <footer>
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button className="button" disabled={busy}>
            {busy ? "Saving…" : "Save record"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
export function Records({
  resource,
  data,
  refresh,
}: {
  resource: Resource;
  data: Database;
  refresh: () => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [editor, setEditor] = useState<Row | null | undefined>();
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const source = rows(data, resource.name);
  const stateField = resource.fields.find((f) =>
    ["status", "account_status", "player_status", "state"].includes(f.name),
  );
  const filtered = source.filter(
    (row) =>
      (!status || row[stateField?.name ?? ""] === status) &&
      resource.fields.some((f) =>
        displayValue(data, resource, f.name, row[f.name])
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
  );
  const shown = filtered.slice(page * 12, page * 12 + 12);
  const columns = resource.fields
    .filter(
      (f) => !["password_hash", "old_value", "new_value"].includes(f.name),
    )
    .slice(0, 7);
  const readOnly = resource.name === "audit_logs";
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">{resource.group} / RECORDS</span>
          <h1>{resource.label}</h1>
          <p>
            Manage {resource.label.toLowerCase()} and their connected tournament
            records.
          </p>
        </div>
        <div className="actions">
          <button
            className="button secondary"
            onClick={() => csvDownload(resource, filtered)}
          >
            <ArrowDownToLine size={16} />
            Export
          </button>
          {!readOnly && (
            <button className="button" onClick={() => setEditor(null)}>
              <Plus size={17} />
              New record
            </button>
          )}
        </div>
      </div>
      <section className="panel">
        <div className="table-toolbar">
          <label className="search">
            <Search size={17} />
            <input
              aria-label={`Search ${resource.label}`}
              placeholder={`Search ${resource.label.toLowerCase()}…`}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
          </label>
          {stateField?.options && (
            <select
              aria-label="Filter status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(0);
              }}
            >
              <option value="">All statuses</option>
              {stateField.options.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          )}
          <span className="muted">{filtered.length} records</span>
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {columns.map((f) => (
                  <th key={f.name}>{f.label}</th>
                ))}
                <th>{readOnly ? "Change history" : "Actions"}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r, i) => (
                <tr key={i}>
                  {columns.map((f) => (
                    <td key={f.name}>
                      {f.options && f.name.includes("status") ? (
                        <Badge value={r[f.name]} />
                      ) : (
                        displayValue(data, resource, f.name, r[f.name])
                      )}
                    </td>
                  ))}
                  {!readOnly && (
                    <td>
                      <div className="row-actions">
                        <button onClick={() => setEditor(r)}>Edit</button>
                        <button
                          className="danger-text"
                          onClick={async () => {
                            if (
                              !window.confirm(
                                `Delete this ${resource.label.toLowerCase()} record? Related records may prevent deletion.`,
                              )
                            )
                              return;
                            try {
                              await api.remove(resource.name, r);
                              setPage(0);
                              await refresh();
                            } catch (e) {
                              setError(String(e));
                            }
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  )}
                  {readOnly && (
                    <td>
                      <details>
                        <summary>View change</summary>
                        <strong>Before</strong>
                        <pre>{r.old_value ? JSON.stringify(JSON.parse(String(r.old_value)), null, 2) : "—"}</pre>
                        <strong>After</strong>
                        <pre>{r.new_value ? JSON.stringify(JSON.parse(String(r.new_value)), null, 2) : "—"}</pre>
                      </details>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!shown.length && (
          <div className="empty">
            <ClipboardList size={32} />
            <h3>
              {source.length ? "No matching records" : "Nothing here yet"}
            </h3>
            <p>
              {source.length
                ? "Try another search or clear the status filter."
                : "Create a record to get started."}
            </p>
          </div>
        )}
        <div className="pagination">
          <span>
            {filtered.length
              ? `${page * 12 + 1}–${Math.min(page * 12 + 12, filtered.length)} of ${filtered.length}`
              : "0 records"}
          </span>
          <div>
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <button
              disabled={(page + 1) * 12 >= filtered.length}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </section>
      {editor !== undefined && (
        <Editor
          resource={resource}
          original={editor ?? undefined}
          data={data}
          onClose={() => setEditor(undefined)}
          onSaved={refresh}
        />
      )}
    </>
  );
}
export default Records;