# Angry Birds

A browser-based Angry Birds clone built with TypeScript, HTML5 Canvas and a custom 2D physics engine. All visuals are rendered in ASCII art style with red-themed foreground elements.

## Features

- Custom 2D rigid-body physics engine (collision detection, impulse resolution, rotation)
- 5 bird types with unique abilities:
  - **Red** — basic projectile
  - **Yellow** — speed boost (press Space)
  - **Blue** — splits into 3 (press Space)
  - **Black** — explodes on command (press Space)
  - **Bounce** — high elasticity, low gravity, bounces off walls and ground
- 3 block materials: Wood, Ice, Stone (different HP and density)
- 5 levels with animated backgrounds (clouds, stars, hills, ruins, snowflakes)
- Infinite random birds — entertainment-first, no game over
- **Text gravity field** powered by [@chenglou/pretext](https://github.com/chenglou/pretext):
  - Background filled with proportional-font paper text (default: *Attention Is All You Need*)
  - Text reacts to physics: repelled by moving objects, glows near static objects
  - Collisions and explosions permanently destroy text characters
  - Load any arXiv paper via the input bar
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
| N | Next level (after win) |
| D | Toggle debug mode |
| ESC | Back to menu |
| 1-5 | Select level from menu |

## arXiv Paper Background

Enter an arXiv ID (e.g. `1706.03762`) or full URL in the input bar above the game canvas, then click **Load Paper** or press Enter. The paper's title and abstract will replace the background text.

## Credits

- Physics text layout: [@chenglou/pretext](https://github.com/chenglou/pretext) (MIT)
