# Visual QA Checklist

## Hero Panels
- Bomb device shows layered materials (metal shell, PCB traces, component blocks) with visible specular + shadow depth.
- Bomb device has ambient idle motion (LED breathing, subtle sway/jitter, alarm pulse).
- Bomb interactions show explicit cursor changes (`crosshair`, `grab`, `pointer`, `not-allowed`).
- Manual flipbook has textured paper, edge depth, corner curl, and animated hotspot affordances.
- Bushfire map renders green terrain + roads + river + landmarks + tree clusters.
- Bushfire firefront uses contours + glow + ember/smoke motion, not only static blobs.

## Interaction Readability
- Hover states are visible within 150ms on all major interactions.
- Drop targets show valid vs invalid feedback instantly.
- Locked interactions render clear disabled affordances.
- Keyboard equivalents exist for focusable action regions.

## Motion and Accessibility
- Default mode is cinematic and visibly animated.
- Reduced FX mode lowers particle density and animation intensity.
- `prefers-reduced-motion` users get reduced mode by default.

## Performance
- Hero widgets sustain smooth interaction on desktop during active simulation.
- Reduced FX mode remains usable on smaller screens and mid-tier devices.

## Regression Snapshot Coverage
- `bomb-device.png` captured from `/visual-regression` route.
- `bomb-manual.png` captured from `/visual-regression` route.
- `bushfire-map.png` captured from `/visual-regression` route.
