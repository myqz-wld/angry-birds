import { Vec2 } from './physics.ts'
import type { Bird } from './entities/bird.ts'
import type { Pig } from './entities/pig.ts'
import type { Block } from './entities/block.ts'
import type { Slingshot } from './entities/slingshot.ts'
import type { Particle } from './particles.ts'
import type { BirdType } from './entities/bird.ts'
import type { BlockMaterial } from './entities/block.ts'
import type { BgElement } from './background.ts'
import type { FieldChar } from './field.ts'

export const CANVAS_WIDTH = 1200
export const CANVAS_HEIGHT = 680
export const GROUND_Y = CANVAS_HEIGHT - 60

const wCache = new Map<string, number>()

const MONO = 'Menlo, Monaco, "Courier New", monospace'
function mono(s: number) { return `${s}px ${MONO}` }

// ASCII art
const BIRD_ART: Record<BirdType, string[]> = {
  red:    [' /^^\\ ', '( >< )', ' \\__/ '],
  yellow: [' /\\ ', '(>>)', ' \\/ '],
  blue:   ['(.)'],
  black:  [' /==\\ ', '(#><#)', ' \\==/ '],
  bounce: [' /o\\ ', '(o.o)', ' \\o/ '],
}

const PIG_ART = {
  small:  ['(o.o)'],
  medium: [" /''\\", '(o  o)', ' \\__/'],
  large:  [' /"""\\ ', '( O O )', ' \\_-_/ '],
}

const BLOCK_FILL: Record<BlockMaterial, string> = { wood: '#', stone: '@', ice: '~' }
const BLOCK_FILL_DMG: Record<BlockMaterial, string> = { wood: '%', stone: '.', ice: '-' }

export interface RenderState {
  birds: Bird[]
  pigs: Pig[]
  blocks: Block[]
  slingshot: Slingshot
  currentBird: Bird | null
  pullPosition: Vec2 | null
  isDragging: boolean
  particles: Particle[]
  score: number
  level: number
  birdsLeft: number
  gameState: 'menu' | 'ready' | 'dragging' | 'aiming' | 'flying' | 'waiting' | 'won' | 'lost'
  stars: number
  deathMarkers: { x: number; y: number; char: string }[]
  totalLevels: number
  levelNames: string[]
  currentBirdType: BirdType | null
  currentBirdAbilityUsed: boolean
  debugMsg: string
  bgElements: BgElement[]
  fieldChars: FieldChar[]
}

export class Renderer {
  private ctx: CanvasRenderingContext2D

  constructor(private canvas: HTMLCanvasElement) {
    this.canvas.width = CANVAS_WIDTH
    this.canvas.height = CANVAS_HEIGHT
    this.ctx = canvas.getContext('2d')!
  }

  private measure(text: string, font: string): number {
    const k = `${font}|${text}`
    const c = wCache.get(k)
    if (c !== undefined) return c
    this.ctx.font = font
    const w = this.ctx.measureText(text).width
    wCache.set(k, w)
    return w
  }

  private asciiArt(ctx: CanvasRenderingContext2D, lines: string[], sz: number, cx: number, cy: number): void {
    const font = mono(sz)
    const lh = sz * 1.15
    const y0 = cy - (lines.length * lh) / 2 + lh / 2
    ctx.font = font
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], cx, y0 + i * lh)
    }
  }

  render(state: RenderState): void {
    const ctx = this.ctx

    if (state.gameState === 'menu') {
      this.drawMenu(ctx, state)
      return
    }

    // 黑色背景
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // 所有前景红色系
    ctx.fillStyle = '#e74c3c'

    this.drawField(ctx, state.fieldChars)
    this.drawBackground(ctx, state.bgElements)
    this.drawGround(ctx)
    this.drawSlingshot(ctx, state.slingshot, state.currentBird, state.pullPosition, state.isDragging, state.gameState)
    this.drawTrails(ctx, state.birds)
    this.drawBlocks(ctx, state.blocks)
    this.drawPigs(ctx, state.pigs)
    this.drawBirds(ctx, state.birds, state.currentBird, state.isDragging, state.gameState)
    // 拖拽中的鸟跟随鼠标
    if (state.gameState === 'dragging' && state.currentBird && state.pullPosition) {
      ctx.fillStyle = '#e74c3c'
      this.drawBirdAt(ctx, state.currentBird, state.pullPosition)
    }
    this.drawParticles(ctx, state.particles)
    this.drawUI(ctx, state)

    // 调试消息
    if (state.debugMsg) {
      ctx.font = mono(18)
      ctx.fillStyle = '#e74c3c'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(state.debugMsg, CANVAS_WIDTH / 2, 50)
    }
  }

  private drawField(ctx: CanvasRenderingContext2D, chars: FieldChar[]): void {
    if (chars.length === 0) return
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    let lastFont = ''
    for (const fc of chars) {
      if (!fc.alive) continue
      const sz = Math.round(fc.baseSz * fc.scale)
      const weight = fc.bold ? 'bold ' : ''
      const font = `${weight}${sz}px Georgia, "Times New Roman", serif`
      if (font !== lastFont) { ctx.font = font; lastFont = font }
      ctx.globalAlpha = fc.alpha
      // 远离时暗灰，受力时亮白
      const bright = Math.min(255, Math.round(80 + fc.alpha * 200))
      ctx.fillStyle = `rgb(${bright},${bright},${bright})`
      ctx.fillText(fc.ch, fc.x, fc.y)
    }
    ctx.globalAlpha = 1
  }

  private drawBackground(ctx: CanvasRenderingContext2D, elements: BgElement[]): void {
    // 先画山丘（最底层）
    for (const el of elements) {
      if (el.type !== 'hill') continue
      ctx.save()
      ctx.fillStyle = el.color
      ctx.font = mono(16)
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      const lh = 16 * 1.15
      for (let i = 0; i < el.art.length; i++) {
        ctx.fillText(el.art[i], el.x, el.y + i * lh)
      }
      ctx.restore()
    }

    // 再画其他元素
    for (const el of elements) {
      if (el.type === 'hill') continue
      ctx.save()
      ctx.globalAlpha = el.alpha
      ctx.fillStyle = el.color
      const sz = el.type === 'cloud' ? 15
        : el.type === 'bird_silhouette' ? 13
        : el.type === 'snowflake' ? 14 : 13
      ctx.font = mono(sz)
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const lh = sz * 1.15
      for (let i = 0; i < el.art.length; i++) {
        ctx.fillText(el.art[i], el.x, el.y + i * lh)
      }
      ctx.restore()
    }
  }

  private drawGround(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = '#c0392b'
    ctx.font = mono(14)
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    let line = ''
    for (let i = 0; i < CANVAS_WIDTH / 8; i++) line += '='
    ctx.fillText(line, 0, GROUND_Y)
  }

  // 死亡残骸标记
  private drawDeathMarkers(ctx: CanvasRenderingContext2D, markers: { x: number; y: number; char: string }[]): void {
    ctx.font = mono(12)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#555'
    for (const m of markers) {
      ctx.fillText(m.char, m.x, m.y)
    }
  }

  private drawSlingshot(ctx: CanvasRenderingContext2D, sling: Slingshot, bird: Bird | null, pull: Vec2 | null, dragging: boolean, gameState: string): void {
    ctx.fillStyle = '#e74c3c'
    const isAiming = gameState === 'aiming' && dragging && pull

    // 橡皮筋（后）— 只在瞄准时
    if (isAiming) {
      ctx.strokeStyle = '#e74c3c'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(sling.armLeft.x, sling.armLeft.y)
      ctx.lineTo(pull!.x, pull!.y)
      ctx.stroke()
    }

    this.asciiArt(ctx, ['\\   /', ' \\ / ', '  |  ', '  |  ', ' /|\\ '], 14, sling.position.x, sling.position.y - 20)

    if (isAiming && bird) {
      // 瞄准中：鸟在弹弓拉伸位置
      this.drawBirdAt(ctx, bird, pull!)
    }

    // 橡皮筋（前）— 只在瞄准时
    if (isAiming) {
      ctx.strokeStyle = '#e74c3c'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(sling.armRight.x, sling.armRight.y)
      ctx.lineTo(pull!.x, pull!.y)
      ctx.stroke()
    }
  }

  private drawTrails(ctx: CanvasRenderingContext2D, birds: Bird[]): void {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const chars = ['.', 'o', '*', '#', '@']
    for (const b of birds) {
      const len = b.trail.length
      if (len === 0) continue
      for (let i = 0; i < len; i++) {
        const t = i / len // 0→旧  1→新
        const alpha = 0.05 + t * 0.95
        const sz = 8 + t * 14
        ctx.save()
        ctx.globalAlpha = alpha
        ctx.fillStyle = '#e74c3c'
        ctx.font = mono(Math.round(sz))
        ctx.fillText(chars[i % chars.length], b.trail[i].x, b.trail[i].y)
        ctx.restore()
      }
    }
  }

  private drawBirds(ctx: CanvasRenderingContext2D, birds: Bird[], cur: Bird | null, isDragging: boolean, gameState: string): void {
    const abilityLabel: Record<string, string> = {
      red:    'RED',
      yellow: 'YEL:boost',
      blue:   'BLU:split',
      black:  'BLK:bomb',
    }

    ctx.fillStyle = '#e74c3c'
    for (const b of birds) {
      if (!b.alive) continue
      if (b === cur && (gameState === 'aiming' || gameState === 'dragging')) continue
      this.drawBirdAt(ctx, b, b.body.position)

      // 地面上未发射的鸟：显示类型和技能
      if (!b.launched && (gameState === 'ready' || gameState === 'menu')) {
        const label = abilityLabel[b.type] || b.type
        ctx.font = mono(9)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillStyle = '#a33'
        ctx.fillText(label, b.body.position.x, b.body.position.y - b.body.radius! - 5)
        ctx.fillStyle = '#e74c3c'
      }
    }
  }

  private drawBirdAt(ctx: CanvasRenderingContext2D, bird: Bird, pos: Vec2): void {
    const r = bird.body.radius!
    const art = BIRD_ART[bird.type]
    const maxLen = Math.max(...art.map(l => l.length))
    const sz = Math.max(10, Math.round(r * 2 / maxLen * 2.5))

    ctx.save()
    ctx.fillStyle = '#e74c3c'
    ctx.translate(pos.x, pos.y)
    if (bird.launched) ctx.rotate(bird.body.angle)
    this.asciiArt(ctx, art, sz, 0, 0)
    ctx.restore()
  }

  private drawPigs(ctx: CanvasRenderingContext2D, pigs: Pig[]): void {
    for (const pig of pigs) {
      if (!pig.alive) continue
      const art = PIG_ART[pig.size]
      const r = pig.body.radius!
      const maxLen = Math.max(...art.map(l => l.length))
      const sz = Math.max(10, Math.round(r * 2 / maxLen * 2.5))
      const hp = pig.hp / pig.maxHp

      ctx.save()
      ctx.fillStyle = '#e74c3c'
      ctx.translate(pig.body.position.x, pig.body.position.y)
      this.asciiArt(ctx, art, sz, 0, 0)
      if (hp < 0.3) {
        ctx.font = mono(10)
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('x_x', 0, -r - 8)
      }
      ctx.restore()
    }
  }

  private drawBlocks(ctx: CanvasRenderingContext2D, blocks: Block[]): void {
    for (const block of blocks) {
      if (!block.alive) continue
      const w = block.body.width
      const h = block.body.height
      const dmg = block.hp < block.maxHp * 0.5
      const ch = dmg ? BLOCK_FILL_DMG[block.material] : BLOCK_FILL[block.material]

      ctx.save()
      ctx.fillStyle = '#e74c3c'
      ctx.translate(block.body.position.x, block.body.position.y)
      ctx.rotate(block.body.angle)

      const charSz = 11
      const font = mono(charSz)
      const cw = this.measure(ch, font)
      const lh = charSz * 1.15
      const cols = Math.max(1, Math.floor(w / cw))
      const rows = Math.max(1, Math.floor(h / lh))

      ctx.font = font
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // 顶部边框
      let top = '+'
      for (let c = 0; c < cols; c++) top += dmg ? '.' : '-'
      top += '+'
      ctx.fillText(top, 0, -h / 2 - 2)

      // 内容行
      for (let r = 0; r < rows; r++) {
        let row = '|'
        for (let c = 0; c < cols; c++) row += ch
        row += '|'
        ctx.fillText(row, 0, -h / 2 + lh * (r + 0.5))
      }

      // 底部边框
      let bot = '+'
      for (let c = 0; c < cols; c++) bot += dmg ? '.' : '-'
      bot += '+'
      ctx.fillText(bot, 0, h / 2 + 2)

      ctx.restore()
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
    const chars = ['*', '+', 'x', '.', 'o']
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i]
      ctx.save()
      ctx.globalAlpha = p.alpha
      ctx.fillStyle = '#e74c3c'
      ctx.translate(p.x, p.y)
      ctx.font = mono(Math.round(p.size * 2))
      ctx.fillText(chars[i % chars.length], 0, 0)
      ctx.restore()
    }
  }

  private drawUI(ctx: CanvasRenderingContext2D, state: RenderState): void {
    ctx.fillStyle = '#e74c3c'
    ctx.font = mono(14)
    ctx.textBaseline = 'top'

    ctx.textAlign = 'left'
    ctx.fillText(`SCORE: ${state.score}`, 10, 8)

    ctx.textAlign = 'center'
    ctx.fillText(`LEVEL ${state.level}`, CANVAS_WIDTH / 2, 8)

    ctx.textAlign = 'right'
    ctx.fillText(`BIRDS: ${state.birdsLeft}`, CANVAS_WIDTH - 10, 8)

    if (state.gameState === 'won') {
      this.drawOverlay(ctx, 'LEVEL CLEAR!', state.stars)
    } else if (state.gameState === 'lost') {
      this.drawOverlay(ctx, 'GAME OVER', 0)
    } else if (state.gameState === 'flying' && state.currentBirdType && !state.currentBirdAbilityUsed) {
      // 飞行中显示技能提示
      const abilityMap: Record<string, string> = {
        yellow: '[SPACE] BOOST!',
        blue:   '[SPACE] SPLIT!',
        black:  '[SPACE] EXPLODE!',
      }
      const hint = abilityMap[state.currentBirdType]
      if (hint) {
        ctx.textAlign = 'center'
        ctx.fillText(hint, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 25)
      }
    } else if (state.gameState === 'ready') {
      ctx.textAlign = 'center'
      ctx.fillText('DRAG bird to slingshot | ESC menu | R retry', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 25)
    }
  }

  private drawOverlay(ctx: CanvasRenderingContext2D, text: string, stars: number): void {
    ctx.fillStyle = 'rgba(0,0,0,0.8)'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    ctx.fillStyle = '#e74c3c'
    ctx.font = mono(40)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30)

    if (stars > 0) {
      let s = ''
      for (let i = 0; i < 3; i++) s += i < stars ? ' [*] ' : ' [ ] '
      ctx.font = mono(20)
      ctx.fillText(s, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 15)
    }

    ctx.font = mono(14)
    ctx.fillText('N: next | R: retry | ESC: menu', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50)
  }

  // 菜单关卡按钮的位置（供点击检测用）
  getMenuButtons(totalLevels: number): { x: number; y: number; w: number; h: number }[] {
    const cols = Math.min(totalLevels, 5)
    const btnW = 120
    const btnH = 50
    const gap = 20
    const totalW = cols * btnW + (cols - 1) * gap
    const startX = CANVAS_WIDTH / 2 - totalW / 2
    const startY = CANVAS_HEIGHT / 2 - 20

    const buttons: { x: number; y: number; w: number; h: number }[] = []
    for (let i = 0; i < totalLevels; i++) {
      const col = i % cols
      const row = Math.floor(i / cols)
      buttons.push({
        x: startX + col * (btnW + gap),
        y: startY + row * (btnH + gap),
        w: btnW,
        h: btnH,
      })
    }
    return buttons
  }

  private drawMenu(ctx: CanvasRenderingContext2D, state: RenderState): void {
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // 标题
    const titleArt = [
      '    _    _   _  ____ ______   __  ____ ___ ____  ____  ____  ',
      '   / \\  | \\ | |/ ___|  _ \\ \\ / / | __ )_ _|  _ \\|  _ \\/ ___| ',
      '  / _ \\ |  \\| | |  _| |_) \\ V /  |  _ \\| || |_) | | | \\___ \\ ',
      ' / ___ \\| |\\  | |_| |  _ < | |   | |_) | ||  _ <| |_| |___) |',
      '/_/   \\_\\_| \\_|\\____|_| \\_\\|_|   |____/___|_| \\_\\____/|____/ ',
    ]
    ctx.fillStyle = '#e74c3c'
    this.asciiArt(ctx, titleArt, 11, CANVAS_WIDTH / 2, 120, )

    // 关卡按钮
    const buttons = this.getMenuButtons(state.totalLevels)
    ctx.font = mono(16)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (let i = 0; i < state.totalLevels; i++) {
      const btn = buttons[i]
      const name = state.levelNames[i] || `Level ${i + 1}`

      // 按钮框
      ctx.strokeStyle = '#e74c3c'
      ctx.lineWidth = 1
      ctx.strokeRect(btn.x, btn.y, btn.w, btn.h)

      // 按钮文字
      ctx.fillStyle = '#e74c3c'
      ctx.font = mono(14)
      ctx.fillText(`[ ${i + 1} ]`, btn.x + btn.w / 2, btn.y + 18)
      ctx.font = mono(11)
      ctx.fillText(name, btn.x + btn.w / 2, btn.y + 36)
    }

    // 底部提示
    ctx.font = mono(14)
    ctx.fillStyle = '#a33'
    ctx.fillText('Press 1-' + state.totalLevels + ' or click to select level', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 60)
    ctx.fillText('ESC to return to menu during game', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 35)
  }

  getCanvas(): HTMLCanvasElement { return this.canvas }
}
