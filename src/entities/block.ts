import { createBody } from '../physics.ts'
import type { Body } from '../physics.ts'

export type BlockMaterial = 'wood' | 'stone' | 'ice'
export type BlockShape = 'square' | 'plank_h' | 'plank_v' | 'triangle'

export interface Block {
  body: Body
  material: BlockMaterial
  blockShape: BlockShape
  hp: number
  maxHp: number
  alive: boolean
}

const MATERIAL_CONFIG: Record<BlockMaterial, { density: number; hp: number; restitution: number; color: string; damageColor: string }> = {
  wood:  { density: 0.6, hp: 200,  restitution: 0.2, color: '#d4a574',  damageColor: '#a0784c' },
  stone: { density: 1.2, hp: 500, restitution: 0.1, color: '#95a5a6',  damageColor: '#7f8c8d' },
  ice:   { density: 0.4, hp: 100,  restitution: 0.3, color: '#85c1e9',  damageColor: '#5dade2' },
}

const SHAPE_SIZE: Record<BlockShape, { width: number; height: number }> = {
  square:  { width: 40, height: 40 },
  plank_h: { width: 100, height: 20 },
  plank_v: { width: 20, height: 100 },
  triangle: { width: 40, height: 40 },
}

export function createBlock(x: number, y: number, material: BlockMaterial, blockShape: BlockShape): Block {
  const matConfig = MATERIAL_CONFIG[material]
  const size = SHAPE_SIZE[blockShape]
  const mass = size.width * size.height * matConfig.density / 1000

  return {
    body: createBody({
      x,
      y,
      width: size.width,
      height: size.height,
      mass,
      shape: 'rect',
      restitution: matConfig.restitution,
      friction: 0.7,
    }),
    material,
    blockShape,
    hp: matConfig.hp,
    maxHp: matConfig.hp,
    alive: true,
  }
}

export function getBlockColor(block: Block): string {
  const config = MATERIAL_CONFIG[block.material]
  const ratio = block.hp / block.maxHp
  if (ratio > 0.5) return config.color
  return config.damageColor
}

export function getBlockBorderColor(material: BlockMaterial): string {
  switch (material) {
    case 'wood':  return '#8B6914'
    case 'stone': return '#6c7a7d'
    case 'ice':   return '#2e86c1'
  }
}
