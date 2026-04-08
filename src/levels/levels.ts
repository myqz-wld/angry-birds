import type { BirdType } from '../entities/bird.ts'
import type { BlockMaterial, BlockShape } from '../entities/block.ts'
import { GROUND_Y } from '../renderer.ts'

export interface LevelDef {
  name: string
  birds: BirdType[]
  pigs: { x: number; y: number; size: 'small' | 'medium' | 'large' }[]
  blocks: { x: number; y: number; material: BlockMaterial; shape: BlockShape }[]
  threeStarScore: number
  twoStarScore: number
}

// 底边贴地，y 向上偏移，留 1px 间隙防止浮点精确碰撞抖动
function onGround(yOff: number, halfH: number): number {
  return GROUND_Y - yOff - halfH - 1
}

// plank_v: 20x100, plank_h: 100x20, square: 40x40
// pig radius: small=16, medium=22, large=28
// 间距规则：柱子中心到猪中心 >= pigR + 10(plank半宽) + 8(余量)

export const LEVELS: LevelDef[] = [
  // 第 1 关：简单小屋
  {
    name: 'Level 1',
    birds: ['red', 'red', 'red'],
    pigs: [
      { x: 850, y: onGround(0, 22), size: 'medium' },
    ],
    blocks: [
      { x: 805, y: onGround(0, 50), material: 'wood', shape: 'plank_v' },
      { x: 895, y: onGround(0, 50), material: 'wood', shape: 'plank_v' },
      { x: 850, y: onGround(100, 10), material: 'wood', shape: 'plank_h' },
    ],
    threeStarScore: 30000,
    twoStarScore: 20000,
  },

  // 第 2 关：双猪并排
  {
    name: 'Level 2',
    birds: ['red', 'red', 'yellow'],
    pigs: [
      { x: 800, y: onGround(0, 16), size: 'small' },
      { x: 920, y: onGround(0, 16), size: 'small' },
    ],
    blocks: [
      { x: 760, y: onGround(0, 50), material: 'wood', shape: 'plank_v' },
      { x: 840, y: onGround(0, 50), material: 'wood', shape: 'plank_v' },
      { x: 880, y: onGround(0, 50), material: 'wood', shape: 'plank_v' },
      { x: 960, y: onGround(0, 50), material: 'wood', shape: 'plank_v' },
      { x: 800, y: onGround(100, 10), material: 'wood', shape: 'plank_h' },
      { x: 920, y: onGround(100, 10), material: 'wood', shape: 'plank_h' },
      { x: 860, y: onGround(120, 20), material: 'wood', shape: 'square' },
    ],
    threeStarScore: 50000,
    twoStarScore: 30000,
  },

  // 第 3 关：冰塔
  {
    name: 'Level 3',
    birds: ['red', 'yellow', 'yellow'],
    pigs: [
      { x: 820, y: onGround(0, 22), size: 'medium' },
      { x: 960, y: onGround(0, 16), size: 'small' },
    ],
    blocks: [
      { x: 775, y: onGround(0, 50), material: 'ice', shape: 'plank_v' },
      { x: 865, y: onGround(0, 50), material: 'ice', shape: 'plank_v' },
      { x: 820, y: onGround(100, 10), material: 'ice', shape: 'plank_h' },
      { x: 820, y: onGround(120, 20), material: 'ice', shape: 'square' },
      { x: 920, y: onGround(0, 20), material: 'ice', shape: 'square' },
      { x: 1000, y: onGround(0, 20), material: 'ice', shape: 'square' },
      { x: 960, y: onGround(40, 10), material: 'ice', shape: 'plank_h' },
    ],
    threeStarScore: 55000,
    twoStarScore: 35000,
  },

  // 第 4 关：石头堡垒
  {
    name: 'Level 4',
    birds: ['red', 'yellow', 'black', 'red'],
    pigs: [
      { x: 850, y: onGround(0, 22), size: 'medium' },
      { x: 850, y: onGround(160, 16), size: 'small' },
      { x: 1020, y: onGround(0, 28), size: 'large' },
    ],
    blocks: [
      { x: 805, y: onGround(0, 50), material: 'stone', shape: 'plank_v' },
      { x: 895, y: onGround(0, 50), material: 'stone', shape: 'plank_v' },
      { x: 850, y: onGround(100, 10), material: 'stone', shape: 'plank_h' },
      { x: 850, y: onGround(120, 20), material: 'wood', shape: 'square' },
      { x: 975, y: onGround(0, 50), material: 'wood', shape: 'plank_v' },
      { x: 1065, y: onGround(0, 50), material: 'wood', shape: 'plank_v' },
      { x: 1020, y: onGround(100, 10), material: 'stone', shape: 'plank_h' },
    ],
    threeStarScore: 70000,
    twoStarScore: 45000,
  },

  // 第 5 关：终极挑战
  {
    name: 'Level 5',
    birds: ['red', 'yellow', 'blue', 'black', 'red'],
    pigs: [
      { x: 740, y: onGround(0, 16), size: 'small' },
      { x: 860, y: onGround(0, 22), size: 'medium' },
      { x: 980, y: onGround(0, 22), size: 'medium' },
      { x: 1080, y: onGround(0, 28), size: 'large' },
    ],
    blocks: [
      // 左塔（冰）
      { x: 700, y: onGround(0, 50), material: 'ice', shape: 'plank_v' },
      { x: 780, y: onGround(0, 50), material: 'ice', shape: 'plank_v' },
      { x: 740, y: onGround(100, 10), material: 'ice', shape: 'plank_h' },
      // 中左塔（木）
      { x: 815, y: onGround(0, 50), material: 'wood', shape: 'plank_v' },
      { x: 905, y: onGround(0, 50), material: 'wood', shape: 'plank_v' },
      { x: 860, y: onGround(100, 10), material: 'wood', shape: 'plank_h' },
      { x: 860, y: onGround(120, 20), material: 'wood', shape: 'square' },
      // 中右塔（石）
      { x: 935, y: onGround(0, 50), material: 'stone', shape: 'plank_v' },
      { x: 1025, y: onGround(0, 50), material: 'stone', shape: 'plank_v' },
      { x: 980, y: onGround(100, 10), material: 'stone', shape: 'plank_h' },
      // 右塔（石）
      { x: 1040, y: onGround(0, 50), material: 'stone', shape: 'plank_v' },
      { x: 1120, y: onGround(0, 50), material: 'stone', shape: 'plank_v' },
      { x: 1080, y: onGround(100, 10), material: 'stone', shape: 'plank_h' },
      { x: 1080, y: onGround(120, 20), material: 'stone', shape: 'square' },
    ],
    threeStarScore: 100000,
    twoStarScore: 60000,
  },
]
