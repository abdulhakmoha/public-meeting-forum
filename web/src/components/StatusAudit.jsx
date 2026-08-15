/**
 * Visual audit status pipeline (no dropdown).
 * steps: ordered statuses; current: active status; rejected: optional branch label
 */
export default function StatusAudit({ steps, current, rejectedLabel = null }) {
  const isRejected = rejectedLabel && current === rejectedLabel;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {steps.map((step, idx) => {
          const currentIdx = steps.indexOf(current);
          const done = !isRejected && currentIdx > idx;
          const active = !isRejected && current === step;
          return (
            <div key={step} className="flex items-center gap-1 shrink-0">
              {idx > 0 && (
                <div className={`w-4 h-0.5 rounded ${done || active ? 'bg-teal-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
              )}
              <div
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border whitespace-nowrap ${
                  active
                    ? 'bg-teal-500 text-white border-teal-500 shadow-sm shadow-teal-500/30'
                    : done
                      ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-400 border-slate-200 dark:border-slate-800'
                }`}
              >
                {done ? '✓ ' : ''}{step}
              </div>
            </div>
          );
        })}
      </div>
      {rejectedLabel && (
        <div
          className={`inline-flex px-2.5 py-1.5 rounded-lg text-[10px] font-bold border ${
            isRejected
              ? 'bg-rose-500 text-white border-rose-500'
              : 'bg-slate-50 dark:bg-slate-950 text-slate-400 border-slate-200 dark:border-slate-800'
          }`}
        >
          {isRejected ? '✕ ' : ''}{rejectedLabel} (branch)
        </div>
      )}
    </div>
  );
}
