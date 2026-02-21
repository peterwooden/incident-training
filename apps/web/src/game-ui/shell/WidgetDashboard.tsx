import type { ReactNode } from "react";

interface WidgetDashboardProps {
  widgetIds: string[];
  renderWidget: (widgetId: string) => ReactNode;
  visibilityLabelForWidget?: (widgetId: string) => string | undefined;
}

export function WidgetDashboard({ widgetIds, renderWidget, visibilityLabelForWidget }: WidgetDashboardProps) {
  return (
    <div className="widget-dashboard">
      {widgetIds.map((widgetId) => (
        <div key={widgetId} className="widget-slot">
          {visibilityLabelForWidget?.(widgetId) && (
            <span className="widget-audience-badge">{visibilityLabelForWidget(widgetId)}</span>
          )}
          {renderWidget(widgetId)}
        </div>
      ))}
    </div>
  );
}
