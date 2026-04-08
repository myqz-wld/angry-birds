import { CANVAS_WIDTH, GROUND_Y } from './renderer.ts'

export type BgType = 'cloud' | 'star' | 'hill' | 'snowflake' | 'bird_silhouette'

export interface BgElement {
  type: BgType
  x: number
  y: number
  speed: number   // px/s，水平移动速度（云/飞鸟），垂直速度（雪花）
  art: string[]
  alpha: number
  phase: number   // 用于闪烁/摇摆的相位偏移
  color: string
}

// --- ASCII 素材 ---

const CLOUD_ART = [
  ['       ___         ', '   __(     )__     ', '  (            )   ', ' (______________) '],
  ['      ____       ', '  __(      )__   ', ' (             )  ', '(________________)'],
  ['    __    __   ', '  (    )(    )  ', ' (              ) ', '(________________)'],
]

const HILL_ART_1 = [
  '                            /\\',
  '                           /  \\',
  '                     /\\   /    \\',
  '                    /  \\_/      \\              /\\',
  '              /\\   /              \\            /  \\',
  '             /  \\_/                \\     /\\   /    \\',
  '       /\\   /                       \\   /  \\_/      \\',
  '      /  \\_/                         \\_/              \\',
  '____/                                                   \\______',
]

const HILL_ART_2 = [
  '                  /\\',
  '                 /  \\                /\\',
  '                /    \\              /  \\',
  '               /      \\            /    \\',
  '         /\\   /        \\     /\\   /      \\',
  '        /  \\ /          \\   /  \\_/        \\',
  '  /\\   /    \\            \\_/               \\',
  '_/  \\_/                                      \\______',
]

const HILL_ART_3 = [
  '                                   /\\',
  '                         /\\       /  \\',
  '                        /  \\     /    \\',
  '                  /\\   /    \\   /      \\',
  '                 /  \\_/      \\_/        \\',
  '           /\\   /                        \\',
  '     /\\   /  \\_/                          \\',
  '    /  \\_/                                  \\',
  '___/                                          \\________',
]

const RUINS_ART_1 = [
  '     |',
  '    ]|',
  '    ]|  _',
  '  __|| | |',
  ' |  ]| | |',
  '_|   |_|_|__',
]

const RUINS_ART_2 = [
  '  _          ',
  ' | | |       ',
  ' | |]|   _   ',
  ' | | |  |]|  ',
  '_|_| |__|]|__',
]

const RUINS_ART_3 = [
  '         _|  ',
  '   |    | |  ',
  '  ]|  _ | |  ',
  '  ]| |]|| |_ ',
  '__|__|]||_| |_',
]

const BIRD_SILHOUETTE = ['~v~']

// --- 工厂函数 ---

function cloud(x: number, y: number, speed: number, color: string): BgElement {
  const art = CLOUD_ART[Math.floor(Math.random() * CLOUD_ART.length)]
  return { type: 'cloud', x, y, speed, art, alpha: 1, phase: 0, color }
}

function star(x: number, y: number, color: string): BgElement {
  const chars = ['.', '*', '+', 'o']
  const ch = chars[Math.floor(Math.random() * chars.length)]
  return {
    type: 'star', x, y, speed: 0, art: [ch],
    alpha: 0.5 + Math.random() * 0.5,
    phase: Math.random() * Math.PI * 2,
    color,
  }
}

function snowflake(x: number, y: number, speed: number): BgElement {
  const chars = ['*', '.', '+', 'o', '~']
  const ch = chars[Math.floor(Math.random() * chars.length)]
  return {
    type: 'snowflake', x, y, speed, art: [ch],
    alpha: 0.4 + Math.random() * 0.5,
    phase: Math.random() * Math.PI * 2,
    color: '#88a',
  }
}

function hill(x: number, art: string[], color: string): BgElement {
  const lh = 16 * 1.15
  const y = GROUND_Y - art.length * lh
  return { type: 'hill', x, y, speed: 0, art, alpha: 1, phase: 0, color }
}

function ruins(x: number, art: string[], color: string): BgElement {
  const lh = 14 * 1.15
  const y = GROUND_Y - art.length * lh
  return { type: 'hill', x, y, speed: 0, art, alpha: 1, phase: 0, color }
}

function birdSilhouette(x: number, y: number, speed: number): BgElement {
  return {
    type: 'bird_silhouette', x, y, speed, art: BIRD_SILHOUETTE,
    alpha: 0.6, phase: Math.random() * Math.PI * 2, color: '#666',
  }
}

// --- 每关背景 ---

export function createLevelBackground(level: number): BgElement[] {
  const elements: BgElement[] = []

  switch (level) {
    case 0: // 第 1 关：晴空
      elements.push(cloud(200, 60, -18, '#555'))
      elements.push(cloud(600, 100, -12, '#444'))
      elements.push(cloud(900, 40, -22, '#555'))
      for (let i = 0; i < 15; i++) {
        elements.push(star(
          Math.random() * CANVAS_WIDTH,
          Math.random() * (GROUND_Y - 100),
          '#666',
        ))
      }
      elements.push(hill(100, HILL_ART_1, '#333'))
      elements.push(ruins(450, RUINS_ART_1, '#2a2a2a'))
      break

    case 1: // 第 2 关：多云
      elements.push(cloud(100, 50, -25, '#555'))
      elements.push(cloud(350, 90, -15, '#4a4a4a'))
      elements.push(cloud(650, 30, -30, '#555'))
      elements.push(cloud(1000, 70, -20, '#444'))
      elements.push(birdSilhouette(300, 120, -35))
      elements.push(birdSilhouette(800, 80, -28))
      for (let i = 0; i < 10; i++) {
        elements.push(star(
          Math.random() * CANVAS_WIDTH,
          Math.random() * (GROUND_Y - 150),
          '#555',
        ))
      }
      elements.push(ruins(500, RUINS_ART_2, '#333'))
      break

    case 2: // 第 3 关：冰雪
      elements.push(cloud(200, 50, -10, '#445'))
      elements.push(cloud(700, 80, -8, '#445'))
      elements.push(hill(50, HILL_ART_2, '#334'))
      elements.push(hill(700, HILL_ART_3, '#2a2a3a'))
      elements.push(ruins(350, RUINS_ART_1, '#2a2a3a'))
      for (let i = 0; i < 40; i++) {
        elements.push(snowflake(
          Math.random() * CANVAS_WIDTH,
          Math.random() * GROUND_Y,
          20 + Math.random() * 30,
        ))
      }
      break

    case 3: // 第 4 关：夜空
      for (let i = 0; i < 40; i++) {
        elements.push(star(
          Math.random() * CANVAS_WIDTH,
          Math.random() * (GROUND_Y - 80),
          '#777',
        ))
      }
      elements.push(hill(80, HILL_ART_1, '#2a2a2a'))
      elements.push(hill(600, HILL_ART_2, '#252525'))
      elements.push(hill(950, HILL_ART_3, '#282828'))
      elements.push(ruins(300, RUINS_ART_3, '#303030'))
      elements.push(ruins(850, RUINS_ART_1, '#282828'))
      break

    case 4: // 第 5 关：风暴
      elements.push(cloud(100, 40, -45, '#555'))
      elements.push(cloud(400, 70, -55, '#4a4a4a'))
      elements.push(cloud(700, 30, -40, '#555'))
      elements.push(cloud(1050, 90, -50, '#444'))
      for (let i = 0; i < 25; i++) {
        elements.push(star(
          Math.random() * CANVAS_WIDTH,
          Math.random() * (GROUND_Y - 100),
          '#666',
        ))
      }
      elements.push(hill(150, HILL_ART_3, '#303030'))
      elements.push(hill(750, HILL_ART_1, '#2a2a2a'))
      elements.push(ruins(400, RUINS_ART_3, '#353535'))
      elements.push(ruins(950, RUINS_ART_2, '#303030'))
      break
  }

  return elements
}

// --- 更新 ---

export function updateBackground(elements: BgElement[], dt: number): void {
  for (const el of elements) {
    switch (el.type) {
      case 'cloud':
      case 'bird_silhouette':
        el.x += el.speed * dt
        // 循环：移出左边后从右边重新进入
        if (el.x < -200) el.x = CANVAS_WIDTH + 50
        if (el.x > CANVAS_WIDTH + 200) el.x = -150
        break

      case 'star':
        // 闪烁
        el.phase += dt * (1.5 + Math.sin(el.phase) * 0.5)
        el.alpha = 0.2 + Math.abs(Math.sin(el.phase)) * 0.8
        break

      case 'snowflake':
        // 缓慢飘落 + 左右摇摆
        el.y += el.speed * dt
        el.phase += dt * 2
        el.x += Math.sin(el.phase) * 15 * dt
        // 落到地面后重置到顶部
        if (el.y > GROUND_Y) {
          el.y = -10
          el.x = Math.random() * CANVAS_WIDTH
        }
        break
    }
  }
}
