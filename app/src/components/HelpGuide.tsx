import { X } from "lucide-react";

type HelpGuideProps = {
  open: boolean;
  onClose: () => void;
};

export default function HelpGuide({ open, onClose }: HelpGuideProps) {
  if (!open) return null;

  return (
    <div
      className="help-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Workspace guide"
    >
      <section className="panel">
        <button
          className="icon-button"
          aria-label="Close guide"
          autoFocus
          onClick={onClose}
        >
          <X size={20} />
        </button>
        <h2>Your tournament, end to end.</h2>
        <ol>
          <li>Create venues, courts, tournaments, categories, and events.</li>
          <li>
            Add players, entries, entry members, and registrations. Link
            registration entries before approval.
          </li>
          <li>
            Review registrations, assign seeds, then generate the
            single-elimination draw in Brackets & scoring.
          </li>
          <li>
            Set schedules, official assignments, and check-ins using the
            resource editors.
          </li>
          <li>
            Record games, submit results, then finalize to advance winners.
          </li>
          <li>
            Manage placements, publish notifications, and export filtered
            records as CSV.
          </li>
        </ol>
        <p className="muted">
          Administration contains every schema resource. API mode requires a
          backend that enforces authentication, resource scope, and
          transaction-level business rules.
        </p>
        <button className="button" onClick={onClose}>
          Got it
        </button>
      </section>
    </div>
  );
}
