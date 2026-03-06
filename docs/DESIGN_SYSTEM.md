# Resound Studio — Design System

> Dark premium aesthetic with glassmorphism, curated for an AI-native experience

---

## Color Palette

### Backgrounds
| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#06060e` | Page background |
| `--bg-secondary` | `#0d0d1a` | Secondary surfaces |
| `--bg-card` | `#111128` | Card backgrounds |
| `--bg-card-hover` | `#16163a` | Card hover state |
| `--bg-glass` | `rgba(17, 17, 40, 0.6)` | Glassmorphism panels |

### Accents
| Token | Value | Usage |
|-------|-------|-------|
| `--accent-purple` | `#8b5cf6` | Primary accent, buttons, active states |
| `--accent-violet` | `#7c3aed` | Secondary purple |
| `--accent-indigo` | `#6366f1` | Gradient endpoint |
| `--accent-cyan` | `#06b6d4` | Secondary accent, code, links |
| `--accent-pink` | `#ec4899` | Tertiary accent, highlights |

### Gradients
| Token | Value |
|-------|-------|
| `--gradient-primary` | `linear-gradient(135deg, #8b5cf6, #6366f1, #06b6d4)` |
| `--gradient-card` | `linear-gradient(135deg, rgba(139,92,246,0.08), rgba(99,102,241,0.04))` |
| `--gradient-border` | `linear-gradient(135deg, rgba(139,92,246,0.3), rgba(6,182,212,0.1))` |

### Text
| Token | Value | Usage |
|-------|-------|-------|
| `--text-primary` | `#f1f5f9` | Headings, primary content |
| `--text-secondary` | `#94a3b8` | Labels, descriptions |
| `--text-muted` | `#64748b` | Hints, meta text |

### Borders & Shadows
| Token | Value |
|-------|-------|
| `--border-subtle` | `rgba(139, 92, 246, 0.12)` |
| `--border-active` | `rgba(139, 92, 246, 0.4)` |
| `--shadow-glow` | `0 0 40px rgba(139, 92, 246, 0.15)` |
| `--shadow-card` | `0 4px 24px rgba(0, 0, 0, 0.4)` |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | `8px` | Small elements, pills |
| `--radius-md` | `12px` | Inputs, buttons |
| `--radius-lg` | `16px` | Cards, panels |
| `--radius-xl` | `24px` | Large containers |

---

## Typography

- **Font Family:** Inter (Google Fonts)
- **Headings:** 800 weight, `-0.02em` letter-spacing
- **Section Labels:** 0.72rem, 600 weight, uppercase, `0.1em` letter-spacing
- **Body:** 0.88–0.95rem, 400–500 weight
- **Monospace:** System mono (for code blocks, terminal output)

---

## Component Patterns

### Glass Card (`.glass-card`)
The primary container element. Uses:
- `backdrop-filter: blur(20px)`
- Semi-transparent background
- Subtle purple border
- Hover: border glow + lift (`translateY(-2px)`)

### Glow Button (`.glow-btn`)
Primary CTA button with:
- Purple gradient background (`#8b5cf6 → #6366f1`)
- Pseudo-element blur glow on hover
- Lift effect on hover
- Disabled: 50% opacity, no cursor

### Input Field (`.input-field`)
- Dark background `rgba(17, 17, 40, 0.8)`
- Focus: purple border + outer ring `box-shadow`

### Tag / Chip (`.tag`)
- Pill-shaped selection element
- Active state: filled purple background
- Used for languages, emotions, paralinguistic tags

### Section Label (`.section-label`)
- Small uppercase label above content groups
- 0.72rem, muted color, 0.1em tracking

---

## Animations

| Name | Duration | Usage |
|------|----------|-------|
| `float1`, `float2`, `float3` | 18–25s | Ambient background orbs |
| `spin` | 1s linear | Loading spinners |
| `pulse-glow` | 2s ease-in-out | Loading indicators |
| `shimmer` | — | Skeleton loading |
| `fadeIn` | — | Element entrance |
| `slideInRight` | — | Panel entrance |
| `progressStripe` | — | Progress bar pattern |
| `wave-bar` | — | Waveform visualization |

---

## Layout

| Token | Value |
|-------|-------|
| `--sidebar-width` | `260px` |
| Main content padding | `32px` (left offset by sidebar width) |
| Max content width | `800px` – `1100px` (varies per page) |
