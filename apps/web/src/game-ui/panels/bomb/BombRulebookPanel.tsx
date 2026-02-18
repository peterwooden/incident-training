import type { BombRulebookPayload } from "@incident/shared";

interface BombRulebookPanelProps {
  payload: BombRulebookPayload;
  currentPage: number;
  onChangePage: (index: number) => void;
}

export function BombRulebookPanel({ payload, currentPage, onChangePage }: BombRulebookPanelProps) {
  const safeIndex = Math.max(0, Math.min(currentPage, payload.pages.length - 1));
  const page = payload.pages[safeIndex];

  return (
    <section className="scene-panel bomb-rulebook-panel">
      <header>
        <h3>Manual Rulebook</h3>
        <p>{payload.hint}</p>
      </header>

      <div className="rulebook-tabs">
        {payload.pages.map((entry, idx) => (
          <button
            key={entry.id}
            className={idx === safeIndex ? "active" : ""}
            onClick={() => onChangePage(idx)}
          >
            {entry.title}
          </button>
        ))}
      </div>

      <article className="rulebook-page">
        <h4>{page?.title}</h4>
        <ul>
          {page?.sections.map((section, idx) => (
            <li key={`${section}-${idx}`}>{section}</li>
          ))}
        </ul>
      </article>
    </section>
  );
}
