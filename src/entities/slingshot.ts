import { Vec2 } from '../physics.ts'

export interface Slingshot {
  position: Vec2 // 弹弓中心位置
  armLeft: Vec2   // 左臂顶端
  armRight: Vec2  // 右臂顶端
  pocketRadius: number // 弹弓口袋半径
  maxStretch: number   // 最大拉伸距离
}

export function createSlingshot(x: number, y: number): Slingshot {
  return {
    position: new Vec2(x, y),
    armLeft: new Vec2(x - 15, y - 50),
    armRight: new Vec2(x + 15, y - 50),
    pocketRadius: 10,
    maxStretch: 120,
  }
}

// 计算发射速度
export function calculateLaunchVelocity(slingshot: Slingshot, pullPosition: Vec2): Vec2 {
  const center = slingshot.armLeft.add(slingshot.armRight).scale(0.5)
  const diff = center.sub(pullPosition)
  const distance = Math.min(diff.length(), slingshot.maxStretch)
  const direction = diff.normalize()

  // 速度与拉伸距离成正比
  const speed = distance * 8
  return direction.scale(speed)
}

// 检查一个点是否在弹弓可拉伸范围内
export function isInSlingshotRange(slingshot: Slingshot, point: Vec2): boolean {
  const center = slingshot.armLeft.add(slingshot.armRight).scale(0.5)
  return point.distanceTo(center) < 60
}
