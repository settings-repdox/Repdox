# Repdox Design System

## Visual strategy

- **Core palette**: deep charcoal base, cold neutral surface, two saturated accent colors.
- **Accent roles**: team accent A and team accent B. Use one accent for live state or active team highlights only.
- **Signature device**: angled panel edges and diagonal separators. All overlay containers use hard-edged geometry with clipped corners and precise visual alignment.
- **Motion**: short, purposeful transitions (150ms–200ms), no overshoot.

## Tokens

- `surface`: #12151b
- `surface-strong`: #0c1015
- `surface-soft`: rgba(255,255,255,0.06)
- `text-primary`: #f7f7f7
- `text-secondary`: #c7cdd6
- `accent-team-a`: #4ea8ff
- `accent-team-b`: #ff5a5f
- `accent-live`: #f4d35e
- `danger`: #e85454
- `neutral-border`: rgba(255,255,255,0.12)

## Type hierarchy

- `headline`: condensed grotesk-style, uppercase for scores and headings.
- `body`: clean sans-serif for labels and admin controls.
- Use a strong typographic scale: large numeric values, compact metadata labels, and stable button text.

## Signature panel

- Use clipped corners on one or two edges to create a broadcast-style trapezoid or chevron cut.
- Maintain a consistent grid rhythm across overlays: dense but legible.

## Implementation notes

- Overlay backgrounds are always transparent.
- Every page re-fetches state on connect; WebSocket is push + resync.
- Admin dashboard uses a disciplined dark UI with high contrast, large touch targets, and explicit live-state indicators.
