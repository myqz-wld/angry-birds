// 二维向量
export class Vec2 {
  constructor(public x: number, public y: number) {}

  add(v: Vec2): Vec2 { return new Vec2(this.x + v.x, this.y + v.y) }
  sub(v: Vec2): Vec2 { return new Vec2(this.x - v.x, this.y - v.y) }
  scale(s: number): Vec2 { return new Vec2(this.x * s, this.y * s) }
  dot(v: Vec2): number { return this.x * v.x + this.y * v.y }
  cross(v: Vec2): number { return this.x * v.y - this.y * v.x }
  length(): number { return Math.sqrt(this.x * this.x + this.y * this.y) }
  lengthSq(): number { return this.x * this.x + this.y * this.y }
  normalize(): Vec2 {
    const len = this.length()
    return len > 0 ? this.scale(1 / len) : new Vec2(0, 0)
  }
  rotate(angle: number): Vec2 {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    return new Vec2(this.x * cos - this.y * sin, this.x * sin + this.y * cos)
  }
  clone(): Vec2 { return new Vec2(this.x, this.y) }
  distanceTo(v: Vec2): number { return this.sub(v).length() }

  static zero(): Vec2 { return new Vec2(0, 0) }
}

// 轴对齐包围盒
export interface AABB {
  min: Vec2
  max: Vec2
}

// 刚体
export interface Body {
  position: Vec2
  velocity: Vec2
  acceleration: Vec2
  angle: number
  angularVelocity: number
  mass: number
  inverseMass: number
  inverseInertia: number
  restitution: number // 弹性系数
  friction: number
  isStatic: boolean
  width: number
  height: number
  radius?: number // 圆形碰撞体
  shape: 'circle' | 'rect'
}

export function createBody(opts: {
  x: number
  y: number
  width?: number
  height?: number
  radius?: number
  mass?: number
  isStatic?: boolean
  restitution?: number
  friction?: number
  shape?: 'circle' | 'rect'
}): Body {
  const mass = opts.isStatic ? 0 : (opts.mass ?? 1)
  const w = opts.width ?? (opts.radius ? opts.radius * 2 : 20)
  const h = opts.height ?? (opts.radius ? opts.radius * 2 : 20)
  const r = opts.radius

  // 转动惯量: 矩形 I = m*(w²+h²)/12, 圆 I = m*r²/2
  let inertia: number
  if (opts.isStatic || mass === 0) {
    inertia = 0
  } else if (r) {
    inertia = mass * r * r / 2
  } else {
    inertia = mass * (w * w + h * h) / 12
  }

  return {
    position: new Vec2(opts.x, opts.y),
    velocity: Vec2.zero(),
    acceleration: Vec2.zero(),
    angle: 0,
    angularVelocity: 0,
    mass,
    inverseMass: mass > 0 ? 1 / mass : 0,
    inverseInertia: inertia > 0 ? 1 / inertia : 0,
    restitution: opts.restitution ?? 0.3,
    friction: opts.friction ?? 0.5,
    isStatic: opts.isStatic ?? false,
    width: w,
    height: h,
    radius: r,
    shape: opts.shape ?? (r ? 'circle' : 'rect'),
  }
}

// 碰撞信息
interface CollisionInfo {
  bodyA: Body
  bodyB: Body
  normal: Vec2
  depth: number
  contactPoint: Vec2
}

const GRAVITY = 800 // 像素/秒^2

// 获取 AABB
function getAABB(body: Body): AABB {
  if (body.shape === 'circle') {
    const r = body.radius!
    return {
      min: new Vec2(body.position.x - r, body.position.y - r),
      max: new Vec2(body.position.x + r, body.position.y + r),
    }
  }
  // 简化：不考虑旋转的 AABB
  const hw = body.width / 2
  const hh = body.height / 2
  return {
    min: new Vec2(body.position.x - hw, body.position.y - hh),
    max: new Vec2(body.position.x + hw, body.position.y + hh),
  }
}

// AABB 重叠检测
function aabbOverlap(a: AABB, b: AABB): boolean {
  return a.min.x <= b.max.x && a.max.x >= b.min.x &&
         a.min.y <= b.max.y && a.max.y >= b.min.y
}

// 圆-圆碰撞
function circleVsCircle(a: Body, b: Body): CollisionInfo | null {
  const diff = b.position.sub(a.position)
  const dist = diff.length()
  const rSum = a.radius! + b.radius!
  if (dist >= rSum) return null

  const normal = dist > 0 ? diff.scale(1 / dist) : new Vec2(1, 0)
  const depth = rSum - dist
  const contactPoint = a.position.add(normal.scale(a.radius!))
  return { bodyA: a, bodyB: b, normal, depth, contactPoint }
}

// 圆-矩形碰撞
function circleVsRect(circle: Body, rect: Body): CollisionInfo | null {
  const hw = rect.width / 2
  const hh = rect.height / 2
  const rel = circle.position.sub(rect.position)

  // 旋转到矩形的局部坐标系
  const cos = Math.cos(-rect.angle)
  const sin = Math.sin(-rect.angle)
  const localX = rel.x * cos - rel.y * sin
  const localY = rel.x * sin + rel.y * cos

  // 找到最近点
  const closestX = Math.max(-hw, Math.min(hw, localX))
  const closestY = Math.max(-hh, Math.min(hh, localY))

  const dx = localX - closestX
  const dy = localY - closestY
  const distSq = dx * dx + dy * dy
  const r = circle.radius!

  if (distSq >= r * r) return null

  const dist = Math.sqrt(distSq)

  // 旋转回世界坐标
  let normalLocal: Vec2
  if (dist > 0) {
    normalLocal = new Vec2(dx / dist, dy / dist)
  } else {
    // 圆心在矩形内部
    const overlapX = hw - Math.abs(localX)
    const overlapY = hh - Math.abs(localY)
    if (overlapX < overlapY) {
      normalLocal = new Vec2(localX > 0 ? 1 : -1, 0)
    } else {
      normalLocal = new Vec2(0, localY > 0 ? 1 : -1)
    }
  }

  const cosR = Math.cos(rect.angle)
  const sinR = Math.sin(rect.angle)
  // normalLocal 从矩形表面指向圆心（rect→circle），需要取反为 circle→rect
  const normal = new Vec2(
    -(normalLocal.x * cosR - normalLocal.y * sinR),
    -(normalLocal.x * sinR + normalLocal.y * cosR)
  )
  const depth = r - dist
  const contactPoint = circle.position.add(normal.scale(r))

  return { bodyA: circle, bodyB: rect, normal, depth, contactPoint }
}

// 矩形-矩形碰撞（简化版 SAT）
function rectVsRect(a: Body, b: Body): CollisionInfo | null {
  const aabbA = getAABB(a)
  const aabbB = getAABB(b)
  if (!aabbOverlap(aabbA, aabbB)) return null

  const hw_a = a.width / 2
  const hh_a = a.height / 2
  const hw_b = b.width / 2
  const hh_b = b.height / 2

  const diff = b.position.sub(a.position)
  const overlapX = (hw_a + hw_b) - Math.abs(diff.x)
  const overlapY = (hh_a + hh_b) - Math.abs(diff.y)

  if (overlapX <= 0 || overlapY <= 0) return null

  let normal: Vec2
  let depth: number
  if (overlapX < overlapY) {
    normal = new Vec2(diff.x > 0 ? 1 : -1, 0)
    depth = overlapX
  } else {
    normal = new Vec2(0, diff.y > 0 ? 1 : -1)
    depth = overlapY
  }

  const contactPoint = a.position.add(b.position).scale(0.5)
  return { bodyA: a, bodyB: b, normal, depth, contactPoint }
}

// 碰撞检测
function detectCollision(a: Body, b: Body): CollisionInfo | null {
  if (a.isStatic && b.isStatic) return null

  if (a.shape === 'circle' && b.shape === 'circle') {
    return circleVsCircle(a, b)
  }
  if (a.shape === 'circle' && b.shape === 'rect') {
    return circleVsRect(a, b)
  }
  if (a.shape === 'rect' && b.shape === 'circle') {
    const result = circleVsRect(b, a)
    if (result) {
      result.normal = result.normal.scale(-1)
      const temp = result.bodyA
      result.bodyA = result.bodyB
      result.bodyB = temp
    }
    return result
  }
  return rectVsRect(a, b)
}

// 仅位置修正，不改变速度
function resolvePositionOnly(info: CollisionInfo): void {
  const { bodyA, bodyB, normal, depth } = info
  const totalInvMass = bodyA.inverseMass + bodyB.inverseMass
  if (totalInvMass === 0) return

  const SLOP = 0.5
  const MAX_CORRECTION = 5
  const correctionDepth = Math.max(0, depth - SLOP)
  const clampedDepth = Math.min(correctionDepth, MAX_CORRECTION)

  const separation = normal.scale(clampedDepth / totalInvMass)
  bodyA.position = bodyA.position.sub(separation.scale(bodyA.inverseMass))
  bodyB.position = bodyB.position.add(separation.scale(bodyB.inverseMass))
}

// 碰撞响应（含旋转力矩）
function resolveCollision(info: CollisionInfo): number {
  const { bodyA, bodyB, normal, depth, contactPoint } = info

  const totalInvMass = bodyA.inverseMass + bodyB.inverseMass
  if (totalInvMass === 0) return 0

  // === 根治：限制每帧最大分离距离，防止深度重叠产生爆炸性位移 ===
  const SLOP = 0.5          // 允许的穿透余量（像素）
  const MAX_CORRECTION = 5  // 每帧最大位移修正（像素）
  const correctionDepth = Math.max(0, depth - SLOP)
  const clampedDepth = Math.min(correctionDepth, MAX_CORRECTION)

  const separation = normal.scale(clampedDepth / totalInvMass)
  bodyA.position = bodyA.position.sub(separation.scale(bodyA.inverseMass))
  bodyB.position = bodyB.position.add(separation.scale(bodyB.inverseMass))

  // 接触点相对质心的力臂
  const rA = contactPoint.sub(bodyA.position)
  const rB = contactPoint.sub(bodyB.position)

  // 含旋转的相对速度
  const velA = bodyA.velocity.add(new Vec2(-rA.y * bodyA.angularVelocity, rA.x * bodyA.angularVelocity))
  const velB = bodyB.velocity.add(new Vec2(-rB.y * bodyB.angularVelocity, rB.x * bodyB.angularVelocity))
  const relVel = velB.sub(velA)
  const velAlongNormal = relVel.dot(normal)

  if (velAlongNormal > 0) return 0

  // 有效质量（含转动惯量）
  const rACrossN = rA.cross(normal)
  const rBCrossN = rB.cross(normal)
  const effectiveMass = totalInvMass
    + rACrossN * rACrossN * bodyA.inverseInertia
    + rBCrossN * rBCrossN * bodyB.inverseInertia

  const e = Math.min(bodyA.restitution, bodyB.restitution)
  const rawJ = -(1 + e) * velAlongNormal / effectiveMass

  // === 根治：限制最大冲量，防止单次碰撞产生灾难性力 ===
  const MAX_IMPULSE = 3000
  const j = Math.min(rawJ, MAX_IMPULSE)

  const impulse = normal.scale(j)

  // 线性冲量
  bodyA.velocity = bodyA.velocity.sub(impulse.scale(bodyA.inverseMass))
  bodyB.velocity = bodyB.velocity.add(impulse.scale(bodyB.inverseMass))

  // 角冲量 —— 只有显著碰撞才产生旋转，防止堆叠抖动
  if (Math.abs(j) > 80) {
    bodyA.angularVelocity -= rA.cross(impulse) * bodyA.inverseInertia
    bodyB.angularVelocity += rB.cross(impulse) * bodyB.inverseInertia
  }

  // 摩擦
  const relVel2 = velB.sub(velA)
  const tangent = relVel2.sub(normal.scale(relVel2.dot(normal))).normalize()
  const jt = -relVel2.dot(tangent) / effectiveMass
  const mu = Math.sqrt(bodyA.friction * bodyB.friction)

  let frictionImpulse: Vec2
  if (Math.abs(jt) < j * mu) {
    frictionImpulse = tangent.scale(jt)
  } else {
    frictionImpulse = tangent.scale(-j * mu)
  }

  bodyA.velocity = bodyA.velocity.sub(frictionImpulse.scale(bodyA.inverseMass))
  bodyB.velocity = bodyB.velocity.add(frictionImpulse.scale(bodyB.inverseMass))
  if (Math.abs(j) > 80) {
    bodyA.angularVelocity -= rA.cross(frictionImpulse) * bodyA.inverseInertia
    bodyB.angularVelocity += rB.cross(frictionImpulse) * bodyB.inverseInertia
  }

  // 返回碰撞相对速度（用于伤害计算，不受角动量影响）
  return Math.abs(velAlongNormal)
}

// 物理世界
export class PhysicsWorld {
  bodies: Body[] = []
  gravity: number = GRAVITY
  private collisionCallbacks: ((info: CollisionInfo, impulse: number) => void)[] = []

  addBody(body: Body): void {
    this.bodies.push(body)
  }

  removeBody(body: Body): void {
    const idx = this.bodies.indexOf(body)
    if (idx !== -1) this.bodies.splice(idx, 1)
  }

  onCollision(callback: (info: CollisionInfo, impulse: number) => void): void {
    this.collisionCallbacks.push(callback)
  }

  update(dt: number): void {
    const maxDt = 1 / 60
    const steps = Math.ceil(dt / maxDt)
    const stepDt = dt / steps

    for (let step = 0; step < steps; step++) {
      // 1. 积分：施加重力和加速度
      for (const body of this.bodies) {
        if (body.isStatic) continue

        body.velocity.y += this.gravity * stepDt
        body.velocity = body.velocity.add(body.acceleration.scale(stepDt))

        // 速度上限——防止穿透
        const MAX_SPEED = 1200
        const speed = body.velocity.length()
        if (speed > MAX_SPEED) {
          body.velocity = body.velocity.scale(MAX_SPEED / speed)
        }

        body.position = body.position.add(body.velocity.scale(stepDt))
        body.angle += body.angularVelocity * stepDt

        // 阻尼
        body.velocity = body.velocity.scale(0.998)
        body.angularVelocity *= 0.92

        // 低速休眠
        if (body.velocity.lengthSq() < 9) {
          body.velocity = Vec2.zero()
        }
        if (Math.abs(body.angularVelocity) < 0.08) {
          body.angularVelocity = 0
        }
      }

      // 2. 多次碰撞迭代——每次都完整解算速度+位置
      //    velAlongNormal > 0 检查自动防止已分离物体重复受力
      //    伤害回调只在第一次迭代触发
      const ITERATIONS = 6
      for (let iter = 0; iter < ITERATIONS; iter++) {
        for (let i = 0; i < this.bodies.length; i++) {
          for (let j = i + 1; j < this.bodies.length; j++) {
            const info = detectCollision(this.bodies[i], this.bodies[j])
            if (info) {
              const impulse = resolveCollision(info)
              if (iter === 0) {
                for (const cb of this.collisionCallbacks) {
                  cb(info, impulse)
                }
              }
            }
          }
        }
      }

      // 支撑检测：所有非静态物体，失去支撑必须下落 + 矩形偏心力矩
      for (const body of this.bodies) {
        if (body.isStatic) continue

        const bottomY = body.shape === 'circle'
          ? body.position.y + body.radius!
          : body.position.y + body.height / 2
        const cx = body.position.x
        let supportMinX = Infinity
        let supportMaxX = -Infinity
        let hasSupport = false

        for (const other of this.bodies) {
          if (other === body) continue
          let otherTop: number
          if (other.shape === 'circle') {
            otherTop = other.position.y - other.radius!
          } else {
            otherTop = other.position.y - other.height / 2
          }
          if (Math.abs(bottomY - otherTop) > 8) continue

          let oLeft: number, oRight: number
          if (other.shape === 'circle') {
            oLeft = other.position.x - other.radius!
            oRight = other.position.x + other.radius!
          } else {
            oLeft = other.position.x - other.width / 2
            oRight = other.position.x + other.width / 2
          }
          supportMinX = Math.min(supportMinX, oLeft)
          supportMaxX = Math.max(supportMaxX, oRight)
          hasSupport = true
        }

        if (!hasSupport) {
          // 只对近乎静止的物体施加下落推力（防止悬浮）
          // 高速运动的物体（如飞行中的鸟）不干预
          if (body.velocity.length() < 50 && body.velocity.y < this.gravity * stepDt) {
            body.velocity.y = this.gravity * stepDt
          }
          continue
        }

        // 矩形偏心力矩（圆形跳过）
        if (body.shape !== 'rect') continue
        if (Math.abs(body.angularVelocity) > 1) continue

        // 重心超出支撑范围 → 施加重力力矩让它翻倒
        if (cx < supportMinX) {
          const lever = supportMinX - cx
          body.angularVelocity -= lever * 0.05 * stepDt * this.gravity * body.inverseMass
        } else if (cx > supportMaxX) {
          const lever = cx - supportMaxX
          body.angularVelocity += lever * 0.05 * stepDt * this.gravity * body.inverseMass
        }
      }
    }
  }
}
