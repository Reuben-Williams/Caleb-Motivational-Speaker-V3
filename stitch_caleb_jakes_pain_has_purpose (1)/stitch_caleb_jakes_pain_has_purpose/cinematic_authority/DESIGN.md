---
name: Cinematic Authority
colors:
  surface: '#131313'
  surface-dim: '#131313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2a2a2a'
  surface-container-highest: '#353534'
  on-surface: '#e5e2e1'
  on-surface-variant: '#d0c5af'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#99907c'
  outline-variant: '#4d4635'
  surface-tint: '#e9c349'
  primary: '#f2ca50'
  on-primary: '#3c2f00'
  primary-container: '#d4af37'
  on-primary-container: '#554300'
  inverse-primary: '#735c00'
  secondary: '#b8c3ff'
  on-secondary: '#002388'
  secondary-container: '#0043eb'
  on-secondary-container: '#c6ceff'
  tertiary: '#ffbebc'
  on-tertiary: '#630d16'
  tertiary-container: '#ff9594'
  on-tertiary-container: '#802328'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffe088'
  primary-fixed-dim: '#e9c349'
  on-primary-fixed: '#241a00'
  on-primary-fixed-variant: '#574500'
  secondary-fixed: '#dde1ff'
  secondary-fixed-dim: '#b8c3ff'
  on-secondary-fixed: '#001356'
  on-secondary-fixed-variant: '#0035be'
  tertiary-fixed: '#ffdad8'
  tertiary-fixed-dim: '#ffb3b1'
  on-tertiary-fixed: '#410007'
  on-tertiary-fixed-variant: '#82252a'
  background: '#131313'
  on-background: '#e5e2e1'
  surface-variant: '#353534'
  body-text: '#FDFCF8'
  ink-black: '#050505'
  joy-gold: '#D4AF37'
  electric-cobalt: '#2E5BFF'
  emotional-burgundy: '#630D16'
typography:
  display-hero:
    fontFamily: Bebas Neue
    fontSize: 120px
    fontWeight: '400'
    lineHeight: 110%
    letterSpacing: 0.02em
  headline-lg:
    fontFamily: Bebas Neue
    fontSize: 64px
    fontWeight: '400'
    lineHeight: 100%
  headline-lg-mobile:
    fontFamily: Bebas Neue
    fontSize: 48px
    fontWeight: '400'
    lineHeight: 100%
  headline-md:
    fontFamily: Bebas Neue
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 110%
  testimonial-quote:
    fontFamily: Source Serif 4
    fontSize: 24px
    fontWeight: '400'
    lineHeight: 150%
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 160%
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 160%
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 100%
    letterSpacing: 0.1em
spacing:
  unit: 8px
  container-max: 1280px
  gutter: 32px
  margin-desktop: 64px
  margin-mobile: 24px
  section-gap: 160px
---

## Brand & Style

The design system is rooted in the "Cinematic Editorial" aesthetic, designed to position the subject as a premium, purpose-driven authority. The visual narrative balances the raw intensity of emotional strength with the polished sophistication of a high-end publication. 

The mood is atmospheric and high-contrast, utilizing "chiaroscuro" lighting techniques where subjects emerge from deep shadows into intentional, dramatic light rays. A subtle film grain overlay is applied across all surfaces to provide a tactile, analog feel that contrasts with the precision of the UI elements. 

The recurring motif of a continuous line, mimicking a microphone cable, serves as a structural element that guides the eye through the content, symbolizing the "unbroken thread of a story" and the connectivity of live performance.

## Colors

The palette is anchored by **Deep Ink Black**, creating a void-like depth that allows other colors to "glow" with cinematic intensity. **Warm Ivory** is the exclusive color for body copy, chosen for its organic, parchment-like quality which is softer on the eyes than pure white in high-contrast settings.

- **Joy Gold:** Reserved for transformational moments, primary CTAs, and highlights. It should feel like a glint of light in the dark.
- **Electric Cobalt:** Used for institutional credibility, such as certifications, stats, and trust markers.
- **Deep Burgundy:** Applied to sections or elements requiring emotional weight and "strength" narratives.

The color mode is strictly dark to maintain the cinematic atmosphere.

## Typography

Typography follows an editorial hierarchy. **Bebas Neue** provides a commanding, condensed presence for headlines, evocative of film posters. This is contrasted by **Inter**, which provides a neutral, highly legible foundation for functional UI and dense narrative text.

A restrained editorial serif, **Source Serif 4**, is introduced specifically for testimonials and block quotes to add a layer of literary prestige and warmth.

For mobile, display sizes scale aggressively to maintain the "impact-first" philosophy while ensuring the line length remains readable on narrow viewports.

## Layout & Spacing

This design system uses a **fixed grid** model for desktop to ensure content maintains a tight, editorial composition regardless of screen width. A 12-column grid is used for desktop, while mobile transitions to a single-column layout with generous vertical "breathing room."

Spacing is intentionally expansive. The `section-gap` of 160px ensures that each narrative beat (e.g., Hero to About to Services) feels like a distinct scene in a film. Alignment should be predominantly left-aligned or centered to maintain a formal, structured appearance.

## Elevation & Depth

Depth is not achieved through drop shadows, but through **tonal layers and light-ray effects**. 

- **Surface Layers:** The background is `ink-black`. Cards and containers use a slightly elevated "Surface" color (a 3% tint of Ivory over Black) with a very low-opacity Ivory border (10%).
- **Atmospheric Depth:** Use backdrop blurs (20px+) behind navigation bars and overlays to simulate frosted glass. 
- **Volumetric Lighting:** Subtle radial gradients (Joy Gold or Cobalt) with 5% opacity are placed behind key subjects or headings to create a "spotlight" effect that pulls elements forward in the Z-space.

## Shapes

The shape language is **Sharp (0)**. To reflect a "masculine, authentic, and architectural" personality, all buttons, input fields, and image containers use 0px border radii. 

The only exception to this rigidity is the **Microphone Cable Motif**, which is a fluid, organic vector line that snakes through the rigid grid, providing a necessary visual contrast and a sense of movement.

## Components

### Buttons
Primary buttons utilize the `joy-gold` background with `ink-black` text. They are rectangular, sharp-edged, and utilize a "reveal" hover state where the background slides in from the left. Secondary buttons are outlined in Ivory with no fill.

### Cards
Cards are "Ghost" styled: no solid background, only a 1px `Ivory / 15%` border. On hover, the border opacity increases to 40% and a subtle `joy-gold` light ray appears at the top edge.

### Input Fields
Inputs are bottom-border only (1px Ivory). Labels use the `label-caps` typography style and are placed above the field. Errors are signaled using the `emotional-burgundy`.

### Continuous Line Motif
The "Microphone Cable" is a 1.5px Ivory line. It should never be static; it should animate slowly (SVGO path animation) as the user scrolls, appearing to "draw" itself across the section dividers.

### Chips / Badges
Chips for certifications (IAPO, RTF) use the `electric-cobalt` as a subtle border with capitalized Inter text. They should feel like "stamps of authority" rather than interactive elements.