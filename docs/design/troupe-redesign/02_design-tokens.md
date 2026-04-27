# Design Tokens

## Theme Strategy

Use CSS variables for light and dark themes.

Dark mode is the primary visual target.  
Light mode should feel like frosted glass white, not pure white.

## Core Colors

```css
:root {
  --background: 220 24% 96%;
  --foreground: 224 28% 10%;

  --surface-1: 0 0% 100%;
  --surface-2: 220 30% 98%;
  --surface-glass: 0 0% 100% / 0.72;

  --border-subtle: 220 18% 88%;
  --border-glass: 220 20% 82% / 0.55;

  --accent-violet: 255 92% 76%;
  --accent-mint: 158 74% 67%;
  --accent-orange: 24 96% 61%;
}

.dark {
  --background: 222 24% 6%;
  --foreground: 220 26% 94%;

  --surface-1: 225 20% 8%;
  --surface-2: 225 18% 10%;
  --surface-glass: 224 18% 12% / 0.72;

  --border-subtle: 220 16% 22%;
  --border-glass: 220 20% 100% / 0.10;

  --accent-violet: 255 92% 76%;
  --accent-mint: 158 74% 67%;
  --accent-orange: 24 96% 61%;
}