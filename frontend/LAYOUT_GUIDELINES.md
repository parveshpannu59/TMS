# Layout Guidelines

## Sidebar & Main Content Layout

### Important: Persistent Drawer Layout Pattern

Our application uses a **persistent drawer** layout pattern for the sidebar. This means:

1. **Sidebar (Persistent Drawer)**:
   - Takes up `260px` width when open
   - Collapses to `0px` when closed
   - Uses `variant="persistent"` (not fixed/absolute positioning)
   - Is part of the normal document flow

2. **Main Content Area**:
   - Uses `flexGrow: 1` to automatically fill remaining space
   - Uses `margin-left: 260px` when sidebar is open
   - **NEVER use explicit width calculations like `width: calc(100% - 260px)`**

3. **AppBar (Header)**:
   - Uses `position: fixed` (removed from document flow)
   - Requires BOTH `width: calc(100% - 260px)` AND `margin-left: 260px`

### ⚠️ Common Mistake to Avoid

**DON'T DO THIS** for the main content:
```tsx
<Box sx={{
  flexGrow: 1,
  width: `calc(100% - ${SIDEBAR_WIDTH}px)`,  // ❌ WRONG!
  ml: `${SIDEBAR_WIDTH}px`,                    // ❌ Double accounting!
}}>
```

**DO THIS** instead:
```tsx
<Box sx={{
  flexGrow: 1,           // ✅ Auto-fills remaining space
  ml: `${SIDEBAR_WIDTH}px`,  // ✅ Only margin needed
}}>
```

### Why This Matters

Using both `width: calc(100% - 260px)` and `margin-left: 260px` on a flexbox child causes:
- Layout conflicts between explicit width and flexGrow
- Responsiveness issues across different screen sizes
- Content overflow and horizontal scrolling
- Improper adaptation when sidebar toggles

### Architecture

```
┌─────────────────────────────────────────┐
│  Parent Box (display: flex)             │
│  ┌──────────┐  ┌──────────────────────┐ │
│  │ Sidebar  │  │  Main Content        │ │
│  │ 260px or │  │  flexGrow: 1         │ │
│  │ 0px      │  │  (auto-expands)      │ │
│  └──────────┘  └──────────────────────┘ │
└─────────────────────────────────────────┘
```

### Files

- `/frontend/src/layouts/DashboardLayout.tsx` - Main layout implementation
- `/frontend/src/components/common/Sidebar.tsx` - Sidebar component
- All page components inherit this layout automatically

### Last Updated
January 15, 2026 - Fixed responsive layout issue by removing width calculations from main content area.
