# UI Design System

> Design guidelines, colors, typography, and component patterns

---

## Design Philosophy

**Brainrot theme, clean execution.**

The brainrot energy lives in the **copy** (text, labels, messages), not the visual design. The UI itself should be:

- Modern and minimal
- Dark mode by default
- Glass morphism accents
- Smooth animations
- Professional-grade polish

Think: **Discord meets Polymarket**, but the copy is unhinged.

---

## Color Palette

### Primary Colors

```css
:root {
  /* Background */
  --bg-primary: #0a0a0a;       /* Near black */
  --bg-secondary: #141414;      /* Card backgrounds */
  --bg-tertiary: #1a1a1a;       /* Elevated surfaces */

  /* Accent */
  --accent-primary: #00D4FF;    /* Electric cyan */
  --accent-secondary: #FF006E;  /* Hot pink */
  --accent-tertiary: #8B5CF6;   /* Purple */

  /* Text */
  --text-primary: #FFFFFF;
  --text-secondary: #A1A1AA;    /* Muted text */
  --text-tertiary: #71717A;     /* Very muted */

  /* Status */
  --success: #22C55E;           /* Green */
  --warning: #F59E0B;           /* Amber */
  --error: #EF4444;             /* Red */

  /* Borders */
  --border-primary: #27272A;
  --border-hover: #3F3F46;
}
```

### Gradients

```css
/* Hero gradient */
.gradient-hero {
  background: linear-gradient(
    135deg,
    rgba(0, 212, 255, 0.1) 0%,
    rgba(255, 0, 110, 0.1) 100%
  );
}

/* Card glow on hover */
.gradient-glow {
  background: radial-gradient(
    ellipse at center,
    rgba(0, 212, 255, 0.15) 0%,
    transparent 70%
  );
}

/* Button gradient */
.gradient-button {
  background: linear-gradient(
    90deg,
    #00D4FF 0%,
    #8B5CF6 100%
  );
}
```

---

## Typography

### Font Stack

```css
:root {
  --font-sans: 'Inter', 'SF Pro Display', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --font-display: 'Inter', sans-serif;  /* For headings */
}
```

### Scale

| Name | Size | Weight | Usage |
|------|------|--------|-------|
| `display-lg` | 48px | 700 | Hero headlines |
| `display` | 36px | 700 | Page titles |
| `heading-lg` | 24px | 600 | Section headers |
| `heading` | 20px | 600 | Card titles |
| `heading-sm` | 16px | 600 | Subsections |
| `body-lg` | 18px | 400 | Emphasized body |
| `body` | 16px | 400 | Default body |
| `body-sm` | 14px | 400 | Secondary text |
| `caption` | 12px | 400 | Labels, hints |
| `mono` | 14px | 400 | Numbers, addresses |

### Text Styles

```css
/* Examples */
.text-display-lg {
  font-size: 48px;
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.text-body {
  font-size: 16px;
  font-weight: 400;
  line-height: 1.5;
}

.text-mono {
  font-family: var(--font-mono);
  font-size: 14px;
  font-feature-settings: 'tnum';  /* Tabular numbers */
}
```

---

## Spacing

### Scale

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
}
```

### Usage Guidelines

- **space-2 (8px)**: Tight spacing, inline elements
- **space-4 (16px)**: Default component padding
- **space-6 (24px)**: Card padding, section gaps
- **space-8 (32px)**: Large gaps between sections
- **space-16 (64px)**: Page section margins

---

## Components

### Buttons

```
┌─────────────────────────────────────────────────────────────────┐
│  PRIMARY (gradient)                                             │
│  ┌─────────────────────┐                                       │
│  │   PLACE BET         │  Gradient bg, white text              │
│  └─────────────────────┘  Used for main CTAs                   │
│                                                                 │
│  SECONDARY (outline)                                            │
│  ┌─────────────────────┐                                       │
│  │   VIEW DETAILS      │  Border only, cyan text               │
│  └─────────────────────┘  Used for secondary actions           │
│                                                                 │
│  GHOST (transparent)                                            │
│  ┌─────────────────────┐                                       │
│  │   Cancel            │  No border, muted text                │
│  └─────────────────────┘  Used for tertiary actions            │
│                                                                 │
│  DESTRUCTIVE                                                    │
│  ┌─────────────────────┐                                       │
│  │   Delete Bet        │  Red bg, white text                   │
│  └─────────────────────┘  Used for dangerous actions           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Button Sizes:**
- `sm`: 32px height, 12px padding
- `md`: 40px height, 16px padding (default)
- `lg`: 48px height, 24px padding

### Cards

```
┌─────────────────────────────────────────────────────────────────┐
│  MARKET CARD                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │  ┌──────┐  "Will ETH hit $5k by March?"                 │   │
│  │  │ 🔥   │                                                │   │
│  │  │GYATT │  Rizz Pool: $127,450                          │   │
│  │  └──────┘  Mode: CAP (hidden)                           │   │
│  │            Closes in: 2d 14h                             │   │
│  │                                                          │   │
│  │  [BET NOW]                                              │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Styles:                                                        │
│  - bg: var(--bg-secondary)                                     │
│  - border: 1px solid var(--border-primary)                     │
│  - border-radius: 16px                                         │
│  - padding: 24px                                               │
│  - hover: border-color var(--border-hover)                     │
│  - hover: subtle glow effect                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Badges

```
STATUS BADGES:

[CAP]           - Purple bg, "hidden mode"
[NO CAP]        - Cyan bg, "public mode"
[GYATT 🍑]      - Pink bg, high volume
[SIGMA MODE]    - Gradient bg, high aura
[OHIO MODE]     - Red bg, losing streak
[RESOLVED]      - Green bg, market ended
[PENDING]       - Yellow bg, waiting
```

### Modals/Dialogs

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                     [X] │   │
│  │  PLACE YOUR BET                                         │   │
│  │                                                          │   │
│  │  "Will ETH hit $5k by March?"                           │   │
│  │                                                          │   │
│  │  ┌─────────────┐  ┌─────────────┐                       │   │
│  │  │             │  │             │                       │   │
│  │  │    YES      │  │     NO      │                       │   │
│  │  │             │  │  [SELECTED] │                       │   │
│  │  └─────────────┘  └─────────────┘                       │   │
│  │                                                          │   │
│  │  Amount: $[________] USDC                               │   │
│  │                                                          │   │
│  │  ⚡ Gasless via Yellow Network                          │   │
│  │                                                          │   │
│  │  [PLACE BET - NO CAP FR FR]                             │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Backdrop: rgba(0,0,0,0.8) with blur                           │
│  Modal: bg-secondary, rounded-2xl, shadow-2xl                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Input Fields

```
┌─────────────────────────────────────────────────────────────────┐
│  DEFAULT INPUT                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Amount                                                  │   │
│  │  ┌─────────────────────────────────────────────────┐    │   │
│  │  │  $ 100                                    USDC  │    │   │
│  │  └─────────────────────────────────────────────────┘    │   │
│  │  Balance: $1,450.00                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Styles:                                                        │
│  - bg: var(--bg-tertiary)                                      │
│  - border: 1px solid var(--border-primary)                     │
│  - focus: border-color var(--accent-primary)                   │
│  - focus: ring 2px var(--accent-primary) 20% opacity           │
│  - border-radius: 12px                                         │
│  - padding: 12px 16px                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Layout

### Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  HEADER (fixed)                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  LOGO    [Markets] [Profile]         [Connect Wallet]   │   │
│  └─────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  MAIN CONTENT                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                          │   │
│  │  max-width: 1280px                                      │   │
│  │  padding: 0 24px                                        │   │
│  │  margin: 0 auto                                         │   │
│  │                                                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  FOOTER                                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Links    |    Powered by Yellow + Uniswap + LI.FI     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Grid System

```css
/* Market grid */
.market-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
}

/* Two-column layout */
.two-col {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 32px;
}

/* Responsive */
@media (max-width: 768px) {
  .two-col {
    grid-template-columns: 1fr;
  }
}
```

---

## Animations

### Transitions

```css
:root {
  --transition-fast: 150ms ease;
  --transition-base: 200ms ease;
  --transition-slow: 300ms ease;
}

/* Usage */
.button {
  transition: all var(--transition-base);
}

.card:hover {
  transition: all var(--transition-slow);
}
```

### Keyframes

```css
/* Fade in */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Slide up */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Pulse glow */
@keyframes pulseGlow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
  }
  50% {
    box-shadow: 0 0 40px rgba(0, 212, 255, 0.5);
  }
}

/* Shimmer (loading) */
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
```

---

## Brainrot Copy Guidelines

### Button Labels
- ❌ "Submit" → ✅ "LFG"
- ❌ "Place Bet" → ✅ "Place Bet - No Cap Fr Fr"
- ❌ "Confirm" → ✅ "Bet"
- ❌ "Cancel" → ✅ "Nah I'm Good"
- ❌ "Connect Wallet" → ✅ "Connect Wallet" (keep this normal)

### Status Messages
- ❌ "Transaction pending" → ✅ "Cooking... 🍳"
- ❌ "Transaction confirmed" → ✅ "That's bussin fr fr ✅"
- ❌ "Error occurred" → ✅ "Bruh. Something broke 💀"
- ❌ "Insufficient balance" → ✅ "You're broke fr 😭"
- ❌ "You won!" → ✅ "W DETECTED 🔥 +$X"
- ❌ "You lost" → ✅ "L. Ohio moment 💀"

### Labels
- Users → Skibidis
- Points → Aura
- Teams → Squads
- Pool → Rizz Pool
- Private → Cap
- Public → No Cap
- High volume → Gyatt
- Losing streak → Ohio Mode
- Fee → Fanum Tax

### Keep Professional
- Error messages should still be clear about what went wrong
- Critical financial info (amounts, balances) stays clear
- Wallet connection flow stays standard
- Don't brainrot the actual numbers

---

## Responsive Breakpoints

```css
/* Mobile first */
@media (min-width: 640px) {
  /* sm: Tablet portrait */
}

@media (min-width: 768px) {
  /* md: Tablet landscape */
}

@media (min-width: 1024px) {
  /* lg: Desktop */
}

@media (min-width: 1280px) {
  /* xl: Large desktop */
}
```

### Mobile Adaptations

1. **Navigation**
   - Header: Logo + hamburger menu
   - Bottom nav bar with icons

2. **Market Cards**
   - Full width, stacked vertically
   - Condensed stats

3. **Betting Modal**
   - Full screen on mobile
   - Fixed bottom button

4. **Profile**
   - Simplified stats display
   - Horizontal scroll for bet history

---

## Dark Mode (Default)

The app is dark mode by default. Light mode can be added as nice-to-have.

```css
/* Dark mode (default) */
:root {
  color-scheme: dark;
}

/* Light mode override (future) */
[data-theme="light"] {
  --bg-primary: #FFFFFF;
  --bg-secondary: #F4F4F5;
  --text-primary: #09090B;
  /* ... */
}
```

---

## Accessibility

### Focus States
- All interactive elements have visible focus rings
- Focus ring color: var(--accent-primary)
- Focus ring offset: 2px

### Color Contrast
- Text on backgrounds: minimum 4.5:1 ratio
- Large text: minimum 3:1 ratio
- Interactive elements: minimum 3:1 ratio

### Screen Reader
- All images have alt text
- Form inputs have labels
- Buttons have descriptive text
- ARIA labels for icons-only buttons

---

## Icons

Use **Lucide React** icons (included with shadcn).

Common icons:
- `Wallet` - wallet/connect
- `TrendingUp` - markets
- `User` - profile
- `Clock` - countdown
- `Eye` / `EyeOff` - show/hide
- `Check` - success
- `X` - close/error
- `Loader2` - loading (animated)
- `ArrowRight` - navigation
- `ExternalLink` - external links

