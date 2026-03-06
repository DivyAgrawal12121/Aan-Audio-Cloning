# Resound Studio — UI Guidelines

> Standards for building consistent, premium pages and components

---

## Page Structure

Every feature page follows  the same anatomy:

```
┌─────────────────────────────────────────────┐
│  Page Header (icon + title + subtitle)      │
├─────────────────────────────────────────────┤
│                                             │
│  Glass Card — Primary input section         │
│  (section-label + form fields)              │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  Glass Card — Secondary section             │
│  (controls, settings, metadata)             │
│                                             │
├─────────────────────────────────────────────┤
│  Progress Bar (when action is running)      │
├─────────────────────────────────────────────┤
│  Glow Button (primary CTA, full width)      │
├─────────────────────────────────────────────┤
│  Output — Audio Player / Result card        │
└─────────────────────────────────────────────┘
```

---

## Page Header Pattern

Every page starts with an icon badge + title + subtitle:

```tsx
<div style={{ marginBottom: "36px" }}>
  <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "12px" }}>
    <div style={{
      width: 48, height: 48, borderRadius: "14px",
      background: "linear-gradient(135deg, COLOR_A, COLOR_B)",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: "0 8px 24px rgba(COLOR_A_RGB, 0.25)",
    }}>
      <Icon size={22} color="white" />
    </div>
    <div>
      <h1 style={{ fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
        Page Title
      </h1>
      <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)" }}>
        Brief description of this page
      </p>
    </div>
  </div>
</div>
```

### Page Gradient Colors

| Page | Gradient | Shadow Color |
|------|----------|-------------|
| Clone | `#8b5cf6 → #6366f1` | Purple |
| Generate | `#06b6d4 → #3b82f6` | Cyan |
| Design | `#ec4899 → #f43f5e` | Pink |
| Foley | `#f59e0b → #ef4444` | Amber |
| Dubbing | `#06b6d4 → #8b5cf6` | Cyan |
| Podcast | `#10b981 → #06b6d4` | Emerald |
| Inpaint | `#f43f5e → #f59e0b` | Rose |
| Voices | `#f59e0b → #ef4444` | Amber |
| Settings | `#64748b → #475569` | Slate |

---

## Form Patterns

### Label + Input

```tsx
<label style={{
  display: "block", fontSize: "0.82rem",
  color: "var(--text-secondary)", marginBottom: "6px", fontWeight: 500,
}}>
  Field Name *
</label>
<input type="text" className="input-field" placeholder="..." />
```

### Section inside Glass Card

```tsx
<div className="glass-card" style={{ padding: "28px", marginBottom: "20px" }}>
  <p className="section-label">Section Title</p>
  {/* content */}
</div>
```

---

## Status Messages

Use colored alert boxes for success/error feedback:

| State | Background | Border | Icon | Color |
|-------|-----------|--------|------|-------|
| Success | `rgba(34, 197, 94, 0.08)` | `rgba(34, 197, 94, 0.2)` | `CheckCircle2` | `#22c55e` |
| Error | `rgba(239, 68, 68, 0.08)` | `rgba(239, 68, 68, 0.2)` | `AlertCircle` | `#ef4444` |

---

## Progress Pattern

Use the `useSimulatedProgress` hook for all async operations:

```tsx
import { useSimulatedProgress } from "@/hooks/useSimulatedProgress";

const { progress, isActive, start, complete } = useSimulatedProgress();

const handleAction = async () => {
  start();
  try {
    await apiCall();
  } finally {
    complete();
  }
};

// Render:
<ProgressBar progress={progress} isActive={isActive} label="Working..." />
```

---

## Button States

### Glow Button (primary CTA)

```tsx
<button
  className="glow-btn"
  disabled={!isValid || isLoading}
  style={{ width: "100%", padding: "16px", fontSize: "1rem" }}
>
  {isLoading ? (
    <>
      <Loader2 size={18} className="pulse-glow" />
      Processing... {Math.round(progress)}%
    </>
  ) : (
    <>
      <Icon size={18} />
      Action Label
    </>
  )}
</button>
```

---

## Responsive Considerations

- **Sidebar:** Fixed 260px on desktop, collapse on mobile (TODO)
- **Content:** Max-width 800–1100px per page
- **Two-column layouts:** Use `gridTemplateColumns: "1fr 340px"` (Generate page)
- **Sticky panels:** `position: "sticky", top: "32px"` for settings sidebars

---

## Icon Library

All icons come from **Lucide React** (`lucide-react`). Common icons:

| Icon | Usage |
|------|-------|
| `Mic` | Voice Cloning |
| `Volume2` | Generate Speech |
| `Sparkles` | Voice Design |
| `Music` | Sound Effects |
| `Languages` | Voice Dubbing |
| `Podcast` | Podcast Studio |
| `Eraser` | Audio Inpainting |
| `Library` | My Voices |
| `Settings` | Settings |
| `Loader2` | Loading states (with `pulse-glow` class) |
| `CheckCircle2` | Success |
| `AlertCircle` | Error |
| `ChevronDown` | Dropdown triggers |
