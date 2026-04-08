import { Vec2 } from './physics.ts'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './renderer.ts'

export type InputEvent =
  | { type: 'down'; pos: Vec2 }
  | { type: 'move'; pos: Vec2 }
  | { type: 'up'; pos: Vec2 }
  | { type: 'key'; key: string }

export class InputManager {
  private events: InputEvent[] = []
  private canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.setupListeners()
  }

  private setupListeners(): void {
    const getPos = (e: MouseEvent | Touch): Vec2 => {
      const rect = this.canvas.getBoundingClientRect()
      const scaleX = CANVAS_WIDTH / rect.width
      const scaleY = CANVAS_HEIGHT / rect.height
      return new Vec2(
        (e.clientX - rect.left) * scaleX,
        (e.clientY - rect.top) * scaleY
      )
    }

    this.canvas.addEventListener('mousedown', (e) => {
      this.events.push({ type: 'down', pos: getPos(e) })
    })

    // mousemove 和 mouseup 监听 window，防止拖出 canvas 后卡住
    window.addEventListener('mousemove', (e) => {
      this.events.push({ type: 'move', pos: getPos(e) })
    })

    window.addEventListener('mouseup', (e) => {
      this.events.push({ type: 'up', pos: getPos(e) })
    })

    // 触摸支持
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault()
      if (e.touches.length > 0) {
        this.events.push({ type: 'down', pos: getPos(e.touches[0]) })
      }
    })

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault()
      if (e.touches.length > 0) {
        this.events.push({ type: 'move', pos: getPos(e.touches[0]) })
      }
    })

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault()
      if (e.changedTouches.length > 0) {
        this.events.push({ type: 'up', pos: getPos(e.changedTouches[0]) })
      }
    })

    window.addEventListener('keydown', (e) => {
      // 阻止空格滚动页面
      if (e.key === ' ') e.preventDefault()
      this.events.push({ type: 'key', key: e.key })
    })
  }

  poll(): InputEvent[] {
    const result = this.events
    this.events = []
    return result
  }
}
