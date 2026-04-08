import { createBody } from '../physics.ts'
import type { Body } from '../physics.ts'

export interface Pig {
  body: Body
  hp: number
  maxHp: number
  alive: boolean
  size: 'small' | 'medium' | 'large'
  score: number
}

const PIG_CONFIG = {
  small:  { radius: 16, mass: 3,  hp: 60,  score: 5000 },
  medium: { radius: 22, mass: 5,  hp: 100, score: 3000 },
  large:  { radius: 28, mass: 8,  hp: 160, score: 1000 },
}

export function createPig(x: number, y: number, size: 'small' | 'medium' | 'large'): Pig {
  const config = PIG_CONFIG[size]
  return {
    body: createBody({
      x,
      y,
      radius: config.radius,
      mass: config.mass,
      shape: 'circle',
      restitution: 0.2,
      friction: 0.6,
    }),
    hp: config.hp,
    maxHp: config.hp,
    alive: true,
    size,
    score: config.score,
  }
}

export function getPigColor(pig: Pig): string {
  const ratio = pig.hp / pig.maxHp
  if (ratio > 0.6) return '#27ae60' // 健康绿
  if (ratio > 0.3) return '#f39c12' // 受伤黄
  return '#e74c3c' // 濒死红
}

export function getPigRadius(size: 'small' | 'medium' | 'large'): number {
  return PIG_CONFIG[size].radius
}
