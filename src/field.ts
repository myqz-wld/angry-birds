import { CANVAS_WIDTH, GROUND_Y } from './renderer.ts'
import type { Body } from './physics.ts'

// pretext 动态加载（开发服务器转译 TS）
let ptPrepareWithSegments: ((text: string, font: string) => any) | null = null
let ptLayoutWithLines: ((prepared: any, maxWidth: number, lineHeight: number) => any) | null = null

import('/@modules/@chenglou/pretext/src/layout.ts' as string).then((m: any) => {
  ptPrepareWithSegments = m.prepareWithSegments
  ptLayoutWithLines = m.layoutWithLines
}).catch(() => {})

export interface FieldChar {
  ch: string
  restX: number
  restY: number
  x: number
  y: number
  vx: number
  vy: number
  alpha: number
  scale: number   // 字号缩放（1 = 基础）
  bold: boolean   // 标题用粗体
  baseSz: number  // 基础字号
  alive: boolean
  hp: number      // 生命值，降到 0 销毁
}

const BODY_FONT = '15px Georgia, "Times New Roman", serif'
const TITLE_FONT = 'bold 20px Georgia, "Times New Roman", serif'
const HEADING_FONT = 'bold 17px Georgia, "Times New Roman", serif'

const FIELD_MARGIN_X = 25
const FIELD_MARGIN_TOP = 40
const FIELD_MAX_WIDTH = CANVAS_WIDTH - FIELD_MARGIN_X * 2
const FIELD_INFLUENCE_RADIUS = 200
const FIELD_BASE_FORCE = 40000
const FIELD_SPRING = 2
const FIELD_DAMPING = 0.92

// Attention Is All You Need — arXiv:1706.03762（保留论文结构）
const DEFAULT_SECTIONS = [
  { type: 'title' as const, text: 'Attention Is All You Need' },
  { type: 'heading' as const, text: 'Abstract' },
  { type: 'body' as const, text: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.' },
  { type: 'body' as const, text: 'Experiments on two machine translation tasks show these models to be superior in quality while being more parallelizable and requiring significantly less time to train. Our model achieves 28.4 BLEU on the WMT 2014 English-to-German translation task, improving over the existing best results, including ensembles, by over 2 BLEU.' },
  { type: 'heading' as const, text: 'Introduction' },
  { type: 'body' as const, text: 'Recurrent neural networks, long short-term memory and gated recurrent neural networks in particular, have been firmly established as state of the art approaches in sequence modeling and transduction problems such as language modeling and machine translation. Numerous efforts have since continued to push the boundaries of recurrent language models and encoder-decoder architectures.' },
  { type: 'body' as const, text: 'Recurrent models typically factor computation along the symbol positions of the input and output sequences. Aligning the positions to steps in computation time, they generate a sequence of hidden states ht, as a function of the previous hidden state and the input for position t. This inherently sequential nature precludes parallelization within training examples.' },
  { type: 'heading' as const, text: 'Model Architecture' },
  { type: 'body' as const, text: 'The Transformer follows an encoder-decoder structure using stacked self-attention and point-wise, fully connected layers for both the encoder and decoder. Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions.' },
  { type: 'body' as const, text: 'Self-attention, sometimes called intra-attention, is an attention mechanism relating different positions of a single sequence in order to compute a representation of the sequence. The Transformer is the first transduction model relying entirely on self-attention to compute representations of its input and output without using sequence-aligned RNNs or convolution.' },
  { type: 'heading' as const, text: 'Results' },
  { type: 'body' as const, text: 'On the WMT 2014 English-to-French translation task, our model establishes a new single-model state-of-the-art BLEU score of 41.0 after training for 3.5 days on eight GPUs, a small fraction of the training costs of the best models from the literature. We show that the Transformer generalizes well to other tasks by applying it successfully to English constituency parsing both with large and limited training data.' },
]

type SectionType = 'title' | 'heading' | 'body'
const SECTION_CONFIG: Record<SectionType, { font: string; lineHeight: number; sz: number; gapAfter: number }> = {
  title:   { font: TITLE_FONT,   lineHeight: 28, sz: 20, gapAfter: 12 },
  heading: { font: HEADING_FONT, lineHeight: 24, sz: 17, gapAfter: 6 },
  body:    { font: BODY_FONT,    lineHeight: 20, sz: 15, gapAfter: 8 },
}

function layoutSection(
  text: string, type: SectionType, startY: number, chars: FieldChar[]
): number {
  const cfg = SECTION_CONFIG[type]
  const isBold = type !== 'body'

  if (ptPrepareWithSegments && ptLayoutWithLines) {
    const prepared = ptPrepareWithSegments(text, cfg.font)
    const result = ptLayoutWithLines(prepared, FIELD_MAX_WIDTH, cfg.lineHeight)

    let cy = startY
    for (const line of result.lines) {
      if (cy > GROUND_Y - 25) return cy
      const lineText = line.text
      let cx = FIELD_MARGIN_X
      const charWidth = line.width / Math.max(1, lineText.length)
      for (let i = 0; i < lineText.length; i++) {
        const ch = lineText[i]
        if (ch === ' ') { cx += charWidth; continue }
        chars.push({
          ch, restX: cx, restY: cy,
          x: cx, y: cy, vx: 0, vy: 0,
          alpha: 0.1, scale: 1, bold: isBold, baseSz: cfg.sz, alive: true, hp: 100,
        })
        cx += charWidth
      }
      cy += cfg.lineHeight
    }
    return cy + cfg.gapAfter
  } else {
    // fallback 等宽
    const charW = cfg.sz * 0.6
    const cols = Math.floor(FIELD_MAX_WIDTH / charW)
    let cy = startY
    let idx = 0
    while (idx < text.length) {
      if (cy > GROUND_Y - 25) return cy
      for (let c = 0; c < cols && idx < text.length; c++) {
        const ch = text[idx++]
        if (ch === ' ') continue
        chars.push({
          ch, restX: FIELD_MARGIN_X + c * charW, restY: cy,
          x: FIELD_MARGIN_X + c * charW, y: cy, vx: 0, vy: 0,
          alpha: 0.1, scale: 1, bold: isBold, baseSz: cfg.sz, alive: true, hp: 100,
        })
      }
      cy += cfg.lineHeight
    }
    return cy + cfg.gapAfter
  }
}

export function createField(text?: string): FieldChar[] {
  const chars: FieldChar[] = []

  if (text) {
    // 外部文本：当作 body 排版，循环填满
    let cy = FIELD_MARGIN_TOP
    while (cy < GROUND_Y - 25) {
      cy = layoutSection(text, 'body', cy, chars)
    }
  } else {
    // 默认论文：按结构排版，不够则循环
    let cy = FIELD_MARGIN_TOP
    let pass = 0
    while (cy < GROUND_Y - 25) {
      for (const section of DEFAULT_SECTIONS) {
        if (cy > GROUND_Y - 25) break
        // 第二遍以后跳过标题，只重复正文
        if (pass > 0 && section.type === 'title') continue
        cy = layoutSection(section.text, section.type, cy, chars)
      }
      pass++
    }
  }

  return chars
}

// 每帧更新
export function updateField(chars: FieldChar[], bodies: Body[], dt: number): void {
  const rSq = FIELD_INFLUENCE_RADIUS * FIELD_INFLUENCE_RADIUS

  for (const fc of chars) {
    if (!fc.alive) continue
    let forceX = 0
    let forceY = 0
    let nearestStaticDist = Infinity  // 最近静止物体距离

    for (const body of bodies) {
      if (body.isStatic) continue
      const dx = fc.restX - body.position.x
      const dy = fc.restY - body.position.y
      const distSq = dx * dx + dy * dy

      if (distSq > rSq || distSq < 1) continue

      const dist = Math.sqrt(distSq)
      const speed = body.velocity.length()

      if (speed < 10) {
        // 静止物体：不排斥，只记录距离（用于放大字体）
        if (dist < nearestStaticDist) nearestStaticDist = dist
      } else {
        // 运动物体：排斥力
        const magnitude = FIELD_BASE_FORCE * (1 + speed / 100) / distSq
        forceX += (dx / dist) * magnitude
        forceY += (dy / dist) * magnitude
      }
    }

    const springX = (fc.restX - fc.x) * FIELD_SPRING
    const springY = (fc.restY - fc.y) * FIELD_SPRING

    fc.vx = (fc.vx + (forceX + springX) * dt) * FIELD_DAMPING
    fc.vy = (fc.vy + (forceY + springY) * dt) * FIELD_DAMPING
    fc.x += fc.vx * dt
    fc.y += fc.vy * dt

    // 位移 → alpha + scale（运动排斥效果）
    const displacement = Math.sqrt(
      (fc.x - fc.restX) ** 2 + (fc.y - fc.restY) ** 2
    )
    fc.alpha = Math.min(0.6, 0.45 + displacement * 0.15)
    fc.scale = Math.min(2.5, 1 + displacement * 0.06)

    // 静止物体环绕效果：越近字体越大越亮
    if (nearestStaticDist < FIELD_INFLUENCE_RADIUS) {
      const proximity = 1 - nearestStaticDist / FIELD_INFLUENCE_RADIUS
      fc.scale = Math.max(fc.scale, 1 + proximity * 1.2)
      fc.alpha = Math.max(fc.alpha, 0.1 + proximity * 0.35)
    }
  }
}

// 爆炸冲击波：对力场字符施加瞬间强力
export function explodeField(chars: FieldChar[], cx: number, cy: number, radius: number, force: number): void {
  const rSq = radius * radius
  for (const fc of chars) {
    if (!fc.alive) continue
    const dx = fc.restX - cx
    const dy = fc.restY - cy
    const distSq = dx * dx + dy * dy
    if (distSq > rSq || distSq < 1) continue
    const dist = Math.sqrt(distSq)
    const ratio = 1 - dist / radius
    const mag = force * ratio * ratio * ratio
    fc.vx += (dx / dist) * mag
    fc.vy += (dy / dist) * mag
    fc.hp -= mag * 0.5
    if (fc.hp <= 0) fc.alive = false
  }
}
