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

  // arXiv 论文加载
  const arxivInput = document.getElementById('arxiv-input') as HTMLInputElement | null
  const arxivBtn = document.getElementById('arxiv-btn') as HTMLButtonElement | null
  const arxivStatus = document.getElementById('arxiv-status') as HTMLSpanElement | null

  if (arxivBtn && arxivInput && arxivStatus) {
    const loadPaper = async () => {
      let id = arxivInput.value.trim()
      if (!id) return
      // 支持粘贴完整 URL
      const urlMatch = id.match(/arxiv\.org\/abs\/([^\s?#]+)/)
      if (urlMatch) id = urlMatch[1]

      arxivStatus.textContent = 'Loading...'
      arxivBtn.disabled = true
      try {
        const res = await fetch(`/api/arxiv?id=${encodeURIComponent(id)}`)
        const data = await res.json()
        if (data.error) {
          arxivStatus.textContent = `Error: ${data.error}`
        } else if (data.abstract) {
          const text = (data.title ? data.title + '. ' : '') + data.abstract
          game.setFieldText(text)
          arxivStatus.textContent = data.title || id
        } else {
          arxivStatus.textContent = 'No abstract found'
        }
      } catch (e) {
        arxivStatus.textContent = `Fetch failed: ${e}`
      }
      arxivBtn.disabled = false
    }

    arxivBtn.addEventListener('click', loadPaper)
    arxivInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') loadPaper()
    })
  }
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
