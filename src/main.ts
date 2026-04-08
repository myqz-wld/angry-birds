import { Game } from './game.ts'

const canvas = document.getElementById('game') as HTMLCanvasElement
if (!canvas) throw new Error('Canvas element not found')

// 响应式缩放
function resize() {
  const maxWidth = window.innerWidth - 40
  const maxHeight = window.innerHeight - 40
  const aspectRatio = 1200 / 680

  let width: number
  let height: number

  if (maxWidth / maxHeight > aspectRatio) {
    height = maxHeight
    width = height * aspectRatio
  } else {
    width = maxWidth
    height = width / aspectRatio
  }

  canvas.style.width = `${width}px`
  canvas.style.height = `${height}px`
}

window.addEventListener('resize', resize)
resize()

try {
  const game = new Game(canvas)
  game.start()
  console.log('Game started successfully')
} catch (e) {
  console.error('Failed to start game:', e)
  const ctx = canvas.getContext('2d')!
  canvas.width = 1200
  canvas.height = 680
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, 1200, 680)
  ctx.fillStyle = '#e74c3c'
  ctx.font = '24px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText(`Error: ${e}`, 600, 340)
}
