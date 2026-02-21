import type { ReactNode } from "react";

interface WidgetDashboardProps {
  widgetIds: string[];
  renderWidget: (widgetId: string) => ReactNode;
}

export function WidgetDashboard({ widgetIds, renderWidget }: WidgetDashboardProps) {
  return (
    <div className="widget-dashboard">
      {widgetIds.map((widgetId) => (
        <div key={widgetId} className="widget-slot">
          {renderWidget(widgetId)}
        </div>
      ))}
    </div>
  );
}
