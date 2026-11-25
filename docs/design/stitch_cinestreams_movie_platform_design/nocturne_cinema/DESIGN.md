---
name: Nocturne Cinema
colors:
  surface: '#0d1322'
  surface-dim: '#0d1322'
  surface-bright: '#33394a'
  surface-container-lowest: '#080e1d'
  surface-container-low: '#151b2b'
  surface-container: '#191f2f'
  surface-container-high: '#242a3a'
  surface-container-highest: '#2f3445'
  on-surface: '#dde2f8'
  on-surface-variant: '#d8c3ad'
  inverse-surface: '#dde2f8'
  inverse-on-surface: '#2a3040'
  outline: '#a08e7a'
  outline-variant: '#534434'
  surface-tint: '#ffb95f'
  primary: '#ffc174'
  on-primary: '#472a00'
  primary-container: '#f59e0b'
  on-primary-container: '#613b00'
  inverse-primary: '#855300'
  secondary: '#ffc640'
  on-secondary: '#402d00'
  secondary-container: '#e3aa00'
  on-secondary-container: '#5a4100'
  tertiary: '#8ed5ff'
  on-tertiary: '#00354a'
  tertiary-container: '#38bdf8'
  on-tertiary-container: '#004965'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffddb8'
  primary-fixed-dim: '#ffb95f'
  on-primary-fixed: '#2a1700'
  on-primary-fixed-variant: '#653e00'
  secondary-fixed: '#ffdf9f'
  secondary-fixed-dim: '#f9bd22'
  on-secondary-fixed: '#261a00'
  on-secondary-fixed-variant: '#5c4300'
  tertiary-fixed: '#c4e7ff'
  tertiary-fixed-dim: '#7bd0ff'
  on-tertiary-fixed: '#001e2c'
  on-tertiary-fixed-variant: '#004c69'
  background: '#0d1322'
  on-background: '#dde2f8'
  surface-variant: '#2f3445'
typography:
  display-hero:
    fontFamily: Sora
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.02em
  display-hero-mobile:
    fontFamily: Sora
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Sora
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Sora
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Sora
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Sora
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: 0em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: 0em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Sora
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Sora
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.04em
  label-caps:
    fontFamily: Sora
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.08em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 0.75rem
  margin: 3rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system sets the visual signature for an immersive, premium cinema streaming platform. The brand personality blends prestige film curation with high-tech computational intelligence: theatrical, refined, atmospheric, and effortless.

The design movement centers on **Dark Glassmorphism infused with Cinematic Depth**:
- Translucent scrims, high-blur frosted panels, and deep obsidian-midnight layering mimic the sensory experience of a calibrated, private screening theater.
- Luminous amber and golden accents punctuate critical interaction anchors, reminiscent of projection beams, marquee lighting, and curated awards.
- High-contrast card surfaces and media containers preserve the integrity of film artwork while delivering immediate functional clarity for AI recommendation markers, playback telemetry, and tier badges.

## Colors

The palette establishes an ultra-dark canvas calibrated for low-light viewing environments, preventing eye fatigue while making color grading on poster artwork pop.

### Color Roles
- **Primary (`#F59E0B` / Amber 500):** Represents prime user actions, active playback heads, VIP status badges, and critical interactive affordances.
- **Secondary (`#FBBF24` / Amber 400):** Highlights, hover accents, and star ratings. Used to signal cursor proximity and elevated focus states.
- **Tertiary (`#38BDF8` / Sky 400):** Reserved exclusively for intelligence features: CineAI discovery suggestions, contextual subtitles, smart scene-skipping cues, and technical stream metadata (e.g., 4K HDR, Dolby Atmos).
- **Neutral Canvas (`#0B1120` to `#0F172A`):** The midnight bedrock. Deep navy foundations keep contrast gentler than pure `#000000` while preventing color wash.

### Surface Color Logic
- **Canvas Base:** `#0B1120`
- **Surface Elevation 1 (Cards, Rail Containers):** `rgba(15, 23, 42, 0.65)` layered over base
- **Surface Elevation 2 (Modals, Overlays, Floating Player Chrome):** `rgba(30, 41, 59, 0.75)` with frosted diffusion
- **Border / Edge Rings:** `rgba(255, 255, 255, 0.08)` to define perimeter geometry against deep backgrounds without heavy lines.

## Typography

The typographic hierarchy pairs **Sora** for modern, structural display architecture with **Plus Jakarta Sans** for warm, readable descriptions, synopses, and user feedback.

- **Hero & Title Display:** `Sora` provides geometric authority with subtle futuristic characteristics, anchoring movie marquee headers and category rows.
- **Editorial & Synopsis:** `Plus Jakarta Sans` delivers balanced apertures and legible letterforms that maintain effortless readability at low contrast against rich imagery.
- **Labels & Badges:** `label-caps` in uppercase format provides crisp, micro-scale signaling for video resolutions (4K, UHD, IMAX ENHANCED), maturity ratings (PG-13, TV-MA), and AI markers.

## Layout & Spacing

The streaming interface relies on a **Fluid-Edge Grid** architecture designed to accommodate horizontal media rails, hero viewports, and multi-column catalog browsing.

### Grid & Breakpoints
- **Desktop (1280px+):** 12-column system, 48px outer margins (`margin`), 24px column gutters (`gutter`). Max container width capped at 1920px with centered staging for ultra-wide monitors.
- **Tablet (768px – 1279px):** 8-column system, 32px margins, 16px gutters. Poster rails switch to partial-card peeking to hint at horizontal scroll affordances.
- **Mobile (320px – 767px):** 4-column system, 16px outer margins (`margin-mobile`), 12px column gutters (`gutter-mobile`). Bottom utility navigation docks take over persistent controls.

### Horizontal Carousels & Rails
Poster carousels break outside the layout margins on the trailing edge, bleeding to the screen border with a gradient mask (`rgba(11, 17, 32, 0)` to `#0B1120`) to convey infinite lateral navigation.

## Elevation & Depth

Visual plane differentiation utilizes **Layered Glassmorphic Surfaces with Amber Glow Accents**, keeping surfaces visually light and integrated with background video textures.

- **Layer 0 (Canvas):** Pure base `#0B1120` layered with subtle animated ambient gradient blooms behind prominent hero art.
- **Layer 1 (Recessed/Track):** `rgba(15, 23, 42, 0.45)` with `backdrop-filter: blur(12px)` and inset top-edge stroke `rgba(255, 255, 255, 0.04)`.
- **Layer 2 (Floating Cards & Chrome):** `rgba(15, 23, 42, 0.7)` with `backdrop-filter: blur(20px)`, outer shadow `0 12px 32px -8px rgba(0, 0, 0, 0.6)`, and edge highlight `1px solid rgba(255, 255, 255, 0.1)`.
- **Layer 3 (Overlays, Modals, Full Player HUD):** `rgba(11, 17, 32, 0.85)` with `backdrop-filter: blur(32px)`. In focused states, cards emit a radiant projection glow: `0 0 24px 2px rgba(245, 158, 11, 0.25)`.

## Shapes

The platform adopts a **Rounded (`2`)** profile. Standard elements carry an 8px radius (`0.5rem`), dialogs and cards elevate to 16px (`1rem`), and focal modal panels reach 24px (`1.5rem`).

- **Media Posters & Thumbnails:** 12px corner radii to balance soft, modern edges with maximum rectangular visual canvas for poster artwork.
- **Pill Exceptions:** Interactive badges, tags, playback scrubbers, and quick-filter chips utilize fully circular ends (`9999px`) to create clear tactile contrast against rectangular video screens.

## Components

### Buttons
- **Primary Play CTA:** Vibrant Amber gradient (`linear-gradient(135deg, #F59E0B, #D97706)`), text `#0B1120`, font weight 600 (`label-lg`), height 48px, horizontal padding `space-lg`. Hover expands amber box shadow: `0 0 20px rgba(245, 158, 11, 0.4)`.
- **Secondary Glass CTA:** `rgba(255, 255, 255, 0.08)` fill, `1px solid rgba(255, 255, 255, 0.15)` border, text `#F8FAFC`. Hover switches border to `rgba(245, 158, 11, 0.5)`.
- **Icon Action Buttons (Add to List, Like):** 44px circular glass disks, centered icon in white or muted slate (`#94A3B8`), shifting to `#F59E0B` when active.

### Media Cards (Poster & Backdrop)
- **Base Card:** High aspect ratios (2:3 vertical poster, 16:9 episode thumbnail). Subtle 1px translucent border (`rgba(255, 255, 255, 0.06)`).
- **Hover/Focus State:** Scales by 1.05x with a 250ms cubic-bezier transition (`cubic-bezier(0.16, 1, 0.3, 1)`). Reveals a quick-preview overlay scrim at bottom featuring Play icon, duration, and maturity tag.

### Chips & Movie Tags
- **Genre & Attribute Chips:** Dark glass fill (`rgba(15, 23, 42, 0.8)`), 28px height, rounded-full, border `rgba(255, 255, 255, 0.1)`. Active filters turn amber with black text.
- **Format Badges (4K, HDR, Atmos):** Framed in high-contrast miniature capsule tags with `label-caps` font, semi-transparent background, and solid `#94A3B8` border.

### VIP & Status Badges
- **VIP / Premiere Badge:** Gold gradient border (`#FBBF24` to `#D97706`), text in matching gold, dark background with an ambient internal drop-shadow highlight. Accompanied by a star or crown micro-glyph.

### CineAI Badges & Assistant Controls
- **AI Recommendation Marker:** Sky-blue accent (`#38BDF8`) with deep blue glass scrim (`rgba(56, 189, 248, 0.1)`). Icon uses a dual-sparkle motif.
- **AI Assistant Interface:** Floating omni-dock with frosted glass background (`blur(24px)`), pulsing tertiary halo, and natural language input prompt.

### Player Controls & Scrubber
- **Timeline Scrubber:** Track in `rgba(255, 255, 255, 0.2)` (4px tall, expanding to 8px on hover). Buffered range in `rgba(255, 255, 255, 0.4)`. Played progress highlighted in `#F59E0B` with an amber glowing playhead thumb (16px circle).
- **Floating HUD:** Auto-fades after 3 seconds of cursor inactivity; floats with 24px offset from screen edges over a dark-tinted vertical scrim gradient.

### Input Fields (Search & Filtering)
- **Search Bar:** Height 48px, background `rgba(15, 23, 42, 0.6)`, border `1px solid rgba(255, 255, 255, 0.1)`, leading search icon in `#94A3B8`. Focus triggers border color `#F59E0B` and a subtle 3px outer glow `rgba(245, 158, 11, 0.15)`.