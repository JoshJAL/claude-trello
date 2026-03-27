import { useState, useEffect } from "react";
import { Shield, X } from "lucide-react";

const CONSENT_KEY = "site-consent";

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-(--shore-line) bg-(--sand) px-4 py-3 shadow-lg">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-(--sea-ink-soft)">
          <Shield size={16} className="shrink-0 text-(--lagoon)" />
          <span>
            TaskPilot uses a single essential session token for authentication.{" "}
            <a
              href="/privacy"
              className="font-medium text-(--lagoon) hover:underline"
            >
              Learn more
            </a>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={accept}
            className="rounded-md bg-(--lagoon) px-4 py-1.5 text-xs font-semibold text-white hover:opacity-90"
          >
            Got it
          </button>
          <button
            onClick={accept}
            className="rounded p-1 text-(--sea-ink-soft) hover:text-(--sea-ink)"
            title="Dismiss"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
