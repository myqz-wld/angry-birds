// 粒子效果系统
export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  alpha: number
  life: number
  maxLife: number
  angle: number
  angularVel: number
}

export class ParticleSystem {
  particles: Particle[] = []

  emit(x: number, y: number, count: number, color: string, opts?: {
    speed?: number
    size?: number
    life?: number
    gravity?: boolean
  }): void {
    const speed = opts?.speed ?? 200
    const size = opts?.size ?? 5
    const life = opts?.life ?? 0.8

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const v = speed * (0.3 + Math.random() * 0.7)
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v - (opts?.gravity !== false ? 100 : 0),
        size: size * (0.5 + Math.random()),
        color,
        alpha: 1,
        life,
        maxLife: life,
        angle: Math.random() * Math.PI * 2,
        angularVel: (Math.random() - 0.5) * 10,
      })
    }
  }

  // 爆炸效果
  explode(x: number, y: number, colors: string[]): void {
    for (const color of colors) {
      this.emit(x, y, 12, color, { speed: 400, size: 8, life: 1.2 })
    }
  }

  // 碎片效果
  debris(x: number, y: number, color: string): void {
    this.emit(x, y, 5, color, { speed: 150, size: 4, life: 0.6 })
  }

  // 烟雾效果
  smoke(x: number, y: number): void {
    this.emit(x, y, 3, 'rgba(100,100,100,0.5)', { speed: 50, size: 8, life: 1.2, gravity: false })
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vy += 400 * dt // 粒子重力
      p.life -= dt
      p.alpha = Math.max(0, p.life / p.maxLife)
      p.angle += p.angularVel * dt
      p.size *= 0.99

      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }
  }
}
