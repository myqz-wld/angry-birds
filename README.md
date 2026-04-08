# Angry Birds

A browser-based Angry Birds clone built with TypeScript, HTML5 Canvas and a custom 2D physics engine. All visuals are rendered in ASCII art style.

## Features

- Custom 2D rigid-body physics engine (collision detection, impulse resolution, rotation)
- 4 bird types with unique abilities:
  - **Red** — basic projectile
  - **Yellow** — speed boost (press Space)
  - **Blue** — splits into 3 (press Space)
  - **Black** — explodes on command (press Space)
- 3 block materials: Wood, Ice, Stone (different HP and density)
- 5 progressively difficult levels
- ASCII art rendering on Canvas
- Touch and mouse input support

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) runtime

### Install & Run

```bash
bun install
bun start
```

Open http://localhost:3001 in your browser.

### Build

```bash
bun run build
```

Output will be in `dist/`.

## Controls

| Key / Action | Description |
|---|---|
| Click & drag bird to slingshot | Aim and launch |
| Space | Activate bird ability (while flying) |
| R | Restart current level |
| N | Next level (after win/lose) |
| ESC | Back to menu |
| 1-5 | Select level from menu |
