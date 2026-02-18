import type { PublicInfoPayload } from "@incident/shared";

interface PublicInfoPanelProps {
  payload: PublicInfoPayload;
  advisoryDraft: string;
  onDraftChange: (value: string) => void;
  onPublish: () => void;
  locked: boolean;
}

export function PublicInfoPanel({
  payload,
  advisoryDraft,
  onDraftChange,
  onPublish,
  locked,
}: PublicInfoPanelProps) {
  return (
    <section className="scene-panel public-info-panel">
      <h3>Public Information Console</h3>
      <p>Anxiety: {payload.anxiety}%</p>
      <p>{payload.cadenceHint}</p>
      <textarea value={advisoryDraft} onChange={(event) => onDraftChange(event.target.value)} rows={3} />
      <button disabled={locked} onClick={onPublish}>Publish Advisory</button>
      <ul>
        {payload.advisories.slice(-6).map((advisory, idx) => (
          <li key={`${advisory}-${idx}`}>{advisory}</li>
        ))}
      </ul>
    </section>
  );
}
