import { Vec2, createBody } from '../physics.ts'
import type { Body } from '../physics.ts'

export type BirdType = 'red' | 'yellow' | 'blue' | 'black'

export interface Bird {
  body: Body
  type: BirdType
  launched: boolean
  alive: boolean
  trail: Vec2[] // 飞行轨迹
  hp: number
  maxHp: number
  // 特殊能力是否已使用
  abilityUsed: boolean
}

const BIRD_CONFIG: Record<BirdType, { radius: number; mass: number; color: string; hp: number }> = {
  red:    { radius: 18, mass: 5,  color: '#e74c3c', hp: 100 },
  yellow: { radius: 15, mass: 3,  color: '#f1c40f', hp: 80 },
  blue:   { radius: 12, mass: 2,  color: '#3498db', hp: 60 },
  black:  { radius: 22, mass: 8,  color: '#2c3e50', hp: 150 },
}

export function createBird(x: number, y: number, type: BirdType): Bird {
  const config = BIRD_CONFIG[type]
  return {
    body: createBody({
      x,
      y,
      radius: config.radius,
      mass: config.mass,
      shape: 'circle',
      restitution: 0.4,
      friction: 0.3,
    }),
    type,
    launched: false,
    alive: true,
    trail: [],
    hp: config.hp,
    maxHp: config.hp,
    abilityUsed: false,
  }
}

export function getBirdColor(type: BirdType): string {
  return BIRD_CONFIG[type].color
}

export function getBirdRadius(type: BirdType): number {
  return BIRD_CONFIG[type].radius
}

// 黄色小鸟加速能力
export function activateYellowAbility(bird: Bird): void {
  if (bird.type !== 'yellow' || bird.abilityUsed || !bird.launched) return
  bird.abilityUsed = true
  const dir = bird.body.velocity.normalize()
  bird.body.velocity = dir.scale(bird.body.velocity.length() * 2)
}

// 黑色小鸟爆炸能力（返回爆炸位置）
export function activateBlackAbility(bird: Bird): Vec2 | null {
  if (bird.type !== 'black' || bird.abilityUsed || !bird.launched) return null
  bird.abilityUsed = true
  bird.hp = 0
  bird.alive = false
  return bird.body.position.clone()
}
