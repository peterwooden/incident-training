import type { ReactNode } from "react";

interface PanelDashboardProps {
  panelIds: string[];
  renderPanel: (panelId: string) => ReactNode;
}

export function PanelDashboard({ panelIds, renderPanel }: PanelDashboardProps) {
  return (
    <div className="panel-dashboard">
      {panelIds.map((panelId) => (
        <div key={panelId} className="panel-slot">
          {renderPanel(panelId)}
        </div>
      ))}
    </div>
  );
}
