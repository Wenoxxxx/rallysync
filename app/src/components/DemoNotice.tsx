type DemoNoticeProps = {
  onReset: () => Promise<void>;
};

export default function DemoNotice({ onReset }: DemoNoticeProps) {
  return (
    <div className="demo-notice">
      <span>
        <strong>Local demo</strong> · Changes stay in this browser. No backend or
        authentication is connected.
      </span>
      <button
        onClick={async () => {
          if (window.confirm("Reset all local demo changes?")) {
            await onReset();
          }
        }}
      >
        Reset demo
      </button>
    </div>
  );
}
