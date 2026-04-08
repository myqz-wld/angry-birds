import { Vec2, PhysicsWorld, createBody } from './physics.ts'
import type { Body } from './physics.ts'
import { createBird, activateYellowAbility, activateBlackAbility } from './entities/bird.ts'
import type { Bird } from './entities/bird.ts'
import { createPig } from './entities/pig.ts'
import type { Pig } from './entities/pig.ts'
import { createBlock } from './entities/block.ts'
import type { Block } from './entities/block.ts'
import { createSlingshot, calculateLaunchVelocity } from './entities/slingshot.ts'
import type { Slingshot } from './entities/slingshot.ts'
import { ParticleSystem } from './particles.ts'
import { Renderer, CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y } from './renderer.ts'
import type { RenderState } from './renderer.ts'
import { InputManager } from './input.ts'
import type { InputEvent } from './input.ts'
import { LEVELS } from './levels/levels.ts'
import type { LevelDef } from './levels/levels.ts'
import { createLevelBackground, updateBackground } from './background.ts'
import type { BgElement } from './background.ts'
import { createField, updateField, explodeField } from './field.ts'
import type { FieldChar } from './field.ts'

type GameState = 'menu' | 'ready' | 'dragging' | 'aiming' | 'flying' | 'waiting' | 'won' | 'lost'

const SLINGSHOT_X = 180
const SLINGSHOT_Y = GROUND_Y - 10

const BIRD_TYPES: import('./entities/bird.ts').BirdType[] = ['red', 'yellow', 'blue', 'black', 'black', 'black', 'bounce', 'bounce', 'bounce']

// 碰撞伤害阈值（基于相对速度）
const DAMAGE_THRESHOLD = 250
// 爆炸半径
const EXPLOSION_RADIUS = 130
const EXPLOSION_FORCE = 800

export class Game {
  private physics: PhysicsWorld
  private renderer: Renderer
  private input: InputManager
  private particles: ParticleSystem

  private slingshot: Slingshot
  private birds: Bird[] = []
  private pigs: Pig[] = []
  private blocks: Block[] = []
  private bgElements: BgElement[] = []
  private fieldChars: FieldChar[] = []
  private ground!: Body

  private currentBird: Bird | null = null
  private isDragging = false
  private pullPosition: Vec2 | null = null

  private gameState: GameState = 'ready'
  private score = 0
  private level = 0
  private waitTimer = 0
  private flyTimer = 0
  private stars = 0

  // 死亡标记（记录死亡位置和类型）
  private deathMarkers: { x: number; y: number; char: string }[] = []
  // 调试消息
  private debugMsg = ''
  private debugTimer = 0
  private debugMode = false

  constructor(canvas: HTMLCanvasElement) {
    this.physics = new PhysicsWorld()
    this.renderer = new Renderer(canvas)
    this.input = new InputManager(canvas)
    this.particles = new ParticleSystem()
    this.slingshot = createSlingshot(SLINGSHOT_X, SLINGSHOT_Y)

    this.setupCollisionHandler()
    this.gameState = 'menu'
  }

  private setupCollisionHandler(): void {
    this.physics.onCollision((info, impulse) => {
      if (impulse < DAMAGE_THRESHOLD) return

      const damage = (impulse - DAMAGE_THRESHOLD) * 0.5

      this.applyDamage(info.bodyA, damage, info.contactPoint)
      this.applyDamage(info.bodyB, damage, info.contactPoint)

      // 碰撞对力场文字的冲击
      const impactForce = Math.min(impulse / 5, 400)
      explodeField(this.fieldChars, info.contactPoint.x, info.contactPoint.y, 150, impactForce)
    })
  }

  private applyDamage(body: Body, damage: number, contactPoint: Vec2): void {
    for (const pig of this.pigs) {
      if (pig.body === body && pig.alive) {
        pig.hp -= damage
        if (pig.hp <= 0) {
          pig.alive = false
          this.score += pig.score
          this.deathMarkers.push({ x: pig.body.position.x, y: pig.body.position.y, char: 'x_x' })
          this.particles.explode(pig.body.position.x, pig.body.position.y, ['#fff', '#aaa', '#666'])
          this.debugMsg = `PIG DIED dmg=${Math.round(damage)} pos=(${Math.round(pig.body.position.x)},${Math.round(pig.body.position.y)})`
          this.debugTimer = 4
          this.physics.removeBody(pig.body)
          this.checkGameEnd()
        }
        return
      }
    }

    for (const block of this.blocks) {
      if (block.body === body && block.alive) {
        block.hp -= damage
        if (block.hp <= 0) {
          block.alive = false
          this.score += 500
          this.deathMarkers.push({ x: block.body.position.x, y: block.body.position.y, char: '::' })
          this.particles.explode(block.body.position.x, block.body.position.y, ['#fff', '#888'])
          this.debugMsg = `BLOCK DIED ${block.material} dmg=${Math.round(damage)} pos=(${Math.round(block.body.position.x)},${Math.round(block.body.position.y)})`
          this.debugTimer = 4
          this.physics.removeBody(block.body)
        }
        return
      }
    }
  }

  private applyExplosion(center: Vec2): void {
    // 力场冲击波
    explodeField(this.fieldChars, center.x, center.y, 400, 1200)

    const affectedBodies = [...this.pigs.filter(p => p.alive).map(p => p.body),
                           ...this.blocks.filter(b => b.alive).map(b => b.body)]

    let hitCount = 0
    for (const body of affectedBodies) {
      const diff = body.position.sub(center)
      const dist = diff.length()
      if (dist < EXPLOSION_RADIUS && dist > 0) {
        hitCount++
        const ratio = 1 - dist / EXPLOSION_RADIUS
        const force = ratio * EXPLOSION_FORCE
        const dir = diff.normalize()
        body.velocity = body.velocity.add(dir.scale(force))
        body.angularVelocity += (Math.random() - 0.5) * force * 0.02

        // 爆炸伤害直接扣 HP，绕过碰撞阈值
        for (const pig of this.pigs) {
          if (pig.body === body && pig.alive) {
            pig.hp -= force
            if (pig.hp <= 0) {
              pig.alive = false
              this.score += pig.score
              this.deathMarkers.push({ x: pig.body.position.x, y: pig.body.position.y, char: 'x_x' })
              this.particles.explode(pig.body.position.x, pig.body.position.y, ['#fff', '#aaa'])
              this.physics.removeBody(pig.body)
            }
          }
        }
        for (const block of this.blocks) {
          if (block.body === body && block.alive) {
            block.hp -= force
            if (block.hp <= 0) {
              block.alive = false
              this.score += 500
              this.deathMarkers.push({ x: block.body.position.x, y: block.body.position.y, char: '::' })
              this.particles.explode(block.body.position.x, block.body.position.y, ['#fff', '#888'])
              this.physics.removeBody(block.body)
            }
          }
        }
      }
    }

    this.debugMsg = `EXPLOSION hit ${hitCount}/${affectedBodies.length} bodies`
    this.debugTimer = 3
    this.checkGameEnd()

    // 大量粒子
    this.particles.explode(center.x, center.y, ['#fff', '#ccc', '#888', '#555'])
    this.particles.explode(center.x, center.y, ['#fff', '#fff', '#ccc'])
    this.particles.smoke(center.x, center.y)
    this.particles.smoke(center.x, center.y)
  }

  loadLevel(index: number): void {
    this.level = index
    const def: LevelDef = LEVELS[index % LEVELS.length]

    // 清理
    this.physics = new PhysicsWorld()
    this.setupCollisionHandler()
    this.birds = []
    this.pigs = []
    this.blocks = []
    this.particles = new ParticleSystem()
    this.deathMarkers = []
    this.score = 0
    this.gameState = 'ready'
    this.bgElements = createLevelBackground(index)
    this.fieldChars = createField()

    // 创建地面
    this.ground = createBody({
      x: CANVAS_WIDTH / 2,
      y: GROUND_Y + 200,
      width: CANVAS_WIDTH * 2,
      height: 400,
      isStatic: true,
      shape: 'rect',
      friction: 0.8,
      restitution: 0.1,
    })
    this.physics.addBody(this.ground)

    // 左墙
    const leftWall = createBody({
      x: -50,
      y: CANVAS_HEIGHT / 2,
      width: 100,
      height: CANVAS_HEIGHT * 2,
      isStatic: true,
      shape: 'rect',
    })
    this.physics.addBody(leftWall)

    // 右墙
    const rightWall = createBody({
      x: CANVAS_WIDTH + 50,
      y: CANVAS_HEIGHT / 2,
      width: 100,
      height: CANVAS_HEIGHT * 2,
      isStatic: true,
      shape: 'rect',
    })
    this.physics.addBody(rightWall)

    // 创建小鸟
    // 创建初始鸟（随机类型）
    for (let i = 0; i < 1; i++) {
      this.birds.push(this.spawnRandomBird(i))
    }

    // 创建猪
    for (const p of def.pigs) {
      const pig = createPig(p.x, p.y, p.size)
      this.pigs.push(pig)
      this.physics.addBody(pig.body)
    }

    // 创建方块
    for (const b of def.blocks) {
      const block = createBlock(b.x, b.y, b.material, b.shape)
      this.blocks.push(block)
      this.physics.addBody(block.body)
    }

    this.prepareBird()
  }

  private spawnRandomBird(slot: number): Bird {
    const type = BIRD_TYPES[Math.floor(Math.random() * BIRD_TYPES.length)]
    return createBird(60 + slot * 35, GROUND_Y - 20, type)
  }

  private prepareBird(): void {
    // 找到下一只未发射的鸟
    let next = this.birds.find(b => b.alive && !b.launched)
    if (!next) {
      // 无限模式：自动补充一只随机鸟
      const slot = this.birds.filter(b => b.alive && !b.launched).length
      next = this.spawnRandomBird(slot)
      this.birds.push(next)
    }
    this.currentBird = next
    this.currentBird.body.velocity = Vec2.zero()
    this.gameState = 'ready'
  }

  private launchBird(): void {
    if (!this.currentBird || !this.pullPosition) return

    let velocity = calculateLaunchVelocity(this.slingshot, this.pullPosition)
    // 弹弹鸟速度加倍
    if (this.currentBird.type === 'bounce') velocity = velocity.scale(1.5)
    this.currentBird.body.velocity = velocity
    this.currentBird.launched = true
    this.physics.addBody(this.currentBird.body)

    this.gameState = 'flying'
    this.isDragging = false
    this.pullPosition = null
    this.flyTimer = 0
    this.waitTimer = 0
  }

  private handleInput(events: InputEvent[]): void {
    const slingshotCenter = this.slingshot.armLeft.add(this.slingshot.armRight).scale(0.5)
    const SLINGSHOT_SNAP_DIST = 40

    for (const event of events) {
      switch (event.type) {
        case 'down':
          // 菜单：点击选关
          if (this.gameState === 'menu') {
            const buttons = this.renderer.getMenuButtons(LEVELS.length)
            for (let i = 0; i < buttons.length; i++) {
              const b = buttons[i]
              if (event.pos.x >= b.x && event.pos.x <= b.x + b.w &&
                  event.pos.y >= b.y && event.pos.y <= b.y + b.h) {
                this.loadLevel(i)
                break
              }
            }
            break
          }

          // ready: 点击任意未发射的鸟开始拖拽
          if (this.gameState === 'ready') {
            for (const bird of this.birds) {
              if (!bird.alive || bird.launched) continue
              if (event.pos.distanceTo(bird.body.position) < 40) {
                this.currentBird = bird
                this.isDragging = true
                this.pullPosition = event.pos
                this.gameState = 'dragging'
                break
              }
            }
          }
          // aiming: 已在弹弓上，再次点击拉弹弓
          if (this.gameState === 'aiming' && this.currentBird) {
            if (event.pos.distanceTo(slingshotCenter) < 60) {
              this.isDragging = true
              this.pullPosition = event.pos
            }
          }
          break

        case 'move':
          if (!this.isDragging || !this.currentBird) break

          if (this.gameState === 'dragging') {
            // 拖拽阶段：鸟跟随鼠标
            this.pullPosition = event.pos
            this.currentBird.body.position = event.pos.clone()

            // 靠近弹弓时，吸附到弹弓，进入瞄准
            if (event.pos.distanceTo(slingshotCenter) < SLINGSHOT_SNAP_DIST) {
              this.currentBird.body.position = slingshotCenter.clone()
              this.gameState = 'aiming'
              this.pullPosition = slingshotCenter.clone()
            }
          } else if (this.gameState === 'aiming') {
            // 瞄准阶段：从弹弓拉开
            const diff = event.pos.sub(slingshotCenter)
            const dist = diff.length()
            if (dist > this.slingshot.maxStretch) {
              this.pullPosition = slingshotCenter.add(diff.normalize().scale(this.slingshot.maxStretch))
            } else {
              this.pullPosition = event.pos
            }
          }
          break

        case 'up':
          if (!this.isDragging) break

          if (this.gameState === 'aiming' && this.pullPosition) {
            // 从弹弓释放 → 发射
            this.launchBird()
          } else if (this.gameState === 'dragging' && this.currentBird) {
            // 没到弹弓就松手 → 鸟回到待发射队列位置
            const waitingBirds = this.birds.filter(b => b.alive && !b.launched)
            const slot = waitingBirds.indexOf(this.currentBird)
            this.currentBird.body.position = new Vec2(60 + Math.max(0, slot) * 35, GROUND_Y - 20)
            this.gameState = 'ready'
          }
          this.isDragging = false
          break

        case 'key':
          this.handleKey(event.key)
          break
      }
    }
  }

  private handleKey(key: string): void {
    // 菜单状态：数字键选关
    if (this.gameState === 'menu') {
      const num = parseInt(key)
      if (num >= 1 && num <= LEVELS.length) {
        this.loadLevel(num - 1)
      }
      return
    }

    switch (key) {
      case ' ':
        if (this.gameState === 'flying' && this.currentBird && !this.currentBird.abilityUsed) {
          if (this.currentBird.type === 'yellow') {
            activateYellowAbility(this.currentBird)
            this.particles.emit(this.currentBird.body.position.x, this.currentBird.body.position.y,
              10, '#fff', { speed: 150 })
            this.debugMsg = 'BOOST!'
            this.debugTimer = 2
          } else if (this.currentBird.type === 'black') {
            const pos = activateBlackAbility(this.currentBird)
            if (pos) {
              this.debugMsg = `BOOM at ${Math.round(pos.x)},${Math.round(pos.y)}`
              this.debugTimer = 2
              this.applyExplosion(pos)
              this.physics.removeBody(this.currentBird.body)
            } else {
              this.debugMsg = 'black ability returned null!'
              this.debugTimer = 3
            }
          } else if (this.currentBird.type === 'blue') {
            this.splitBlue()
            this.debugMsg = 'SPLIT!'
            this.debugTimer = 2
          }
        } else {
          // 调试：为什么没触发
          const reasons: string[] = []
          if (this.gameState !== 'flying') reasons.push(`state=${this.gameState}`)
          if (!this.currentBird) reasons.push('no bird')
          if (this.currentBird?.abilityUsed) reasons.push('used')
          if (this.currentBird) reasons.push(`type=${this.currentBird.type}`)
          this.debugMsg = `SPACE: ${reasons.join(', ')}`
          this.debugTimer = 3
        }
        break

      case 'r':
      case 'R':
        this.loadLevel(this.level)
        break

      case 'n':
      case 'N':
        if (this.gameState === 'won' || this.gameState === 'lost') {
          this.loadLevel((this.level + 1) % LEVELS.length)
        }
        break

      case 'Escape':
        this.gameState = 'menu'
        break

      case 'd':
      case 'D':
        this.debugMode = !this.debugMode
        break
    }
  }

  private splitBlue(): void {
    if (!this.currentBird || this.currentBird.type !== 'blue' || this.currentBird.abilityUsed) return
    this.currentBird.abilityUsed = true

    const pos = this.currentBird.body.position
    const vel = this.currentBird.body.velocity

    // 分裂成 3 只小鸟
    for (let i = -1; i <= 1; i++) {
      if (i === 0) continue // 当前鸟保持原方向
      const splitBird = createBird(pos.x, pos.y, 'blue')
      splitBird.launched = true
      splitBird.abilityUsed = true
      splitBird.body.velocity = vel.rotate(i * 0.25)
      this.birds.push(splitBird)
      this.physics.addBody(splitBird.body)
    }

    this.particles.emit(pos.x, pos.y, 8, '#fff', { speed: 100 })
  }

  private checkGameEnd(): void {
    const pigsAlive = this.pigs.filter(p => p.alive).length

    if (pigsAlive === 0) {
      this.gameState = 'won'
      // 无限模式：不计未用鸟加分
      const levelDef = LEVELS[this.level % LEVELS.length]
      if (this.score >= levelDef.threeStarScore) this.stars = 3
      else if (this.score >= levelDef.twoStarScore) this.stars = 2
      else this.stars = 1
    }
    // 无限鸟，不再因鸟用完而 game over
  }

  update(dt: number): void {
    const events = this.input.poll()
    this.handleInput(events)

    if (this.gameState === 'menu') return

    if (this.debugTimer > 0) this.debugTimer -= dt

    // 物理始终运行
    this.physics.update(dt)

    // 弹弹鸟抵消部分重力（只受 30% 重力）
    for (const bird of this.birds) {
      if (bird.alive && bird.launched && bird.type === 'bounce') {
        bird.body.velocity.y -= 800 * 0.7 * dt
      }
    }

    this.particles.update(dt)
    updateBackground(this.bgElements, dt)
    // 力场更新：包含拖拽中的鸟（给文字一点微弱反馈）
    const fieldBodies = [...this.physics.bodies]
    if (this.gameState === 'dragging' && this.currentBird && this.pullPosition) {
      fieldBodies.push({
        ...this.currentBird.body,
        position: this.pullPosition,
        velocity: new Vec2(30, 30), // 模拟微弱运动
        isStatic: false,
      })
    }
    updateField(this.fieldChars, fieldBodies, dt)
    this.cleanupOutOfBounds()

    // 飞行中：更新轨迹、检查鸟是否停止
    if (this.gameState === 'flying' && this.currentBird) {
      this.flyTimer += dt

      if (this.currentBird.launched && this.currentBird.alive) {
        this.currentBird.trail.push(this.currentBird.body.position.clone())
        if (this.currentBird.trail.length > 50) {
          this.currentBird.trail.shift()
        }
      }

      // 鸟死了（黑鸟爆炸）→ 立刻结束
      if (!this.currentBird.alive) {
        this.onBirdDone()
      }
      // 出界
      else if (this.currentBird.body.position.x > CANVAS_WIDTH + 50 ||
               this.currentBird.body.position.y > CANVAS_HEIGHT + 50 ||
               this.currentBird.body.position.x < -50) {
        this.onBirdDone()
      }
      // 速度很低 → 短等后结束
      else if (this.currentBird.body.velocity.length() < 30 && this.currentBird.launched) {
        this.waitTimer += dt
        if (this.waitTimer > 0.3) {
          this.onBirdDone()
        }
      }
      // 飞太久 → 强制结束（弹弹鸟给更长时间）
      else if (this.flyTimer > (this.currentBird.type === 'bounce' ? 12 : 5)) {
        this.onBirdDone()
      }
      else {
        this.waitTimer = 0
      }
    }

    // 等待：物体稳定后准备下一只鸟
    if (this.gameState === 'waiting') {
      this.waitTimer += dt
      // 1秒后检查稳定，或3秒后强制结算
      if (this.waitTimer > 1) {
        let allStable = true
        for (const body of this.physics.bodies) {
          if (!body.isStatic && body.velocity.length() > 20) {
            allStable = false
            break
          }
        }
        if (allStable || this.waitTimer > 3) {
          this.cleanupLaunchedBirds()
          this.waitTimer = 0
          this.checkGameEnd()
          if (this.gameState === 'waiting') {
            this.prepareBird()
          }
        }
      }
    }
  }

  private onBirdDone(): void {
    // 清除拖尾，但不立即移除鸟
    if (this.currentBird) {
      this.currentBird.trail = []
    }
    this.waitTimer = 0
    this.gameState = 'waiting'
  }

  // 清理所有已发射且停止的鸟（包括分裂鸟）
  private cleanupLaunchedBirds(): void {
    for (const bird of this.birds) {
      if (bird.alive && bird.launched) {
        bird.alive = false
        bird.trail = []
        this.physics.removeBody(bird.body)
      }
    }
  }

  private cleanupOutOfBounds(): void {
    let pigDied = false
    for (const pig of this.pigs) {
      if (pig.alive && pig.body.position.y > CANVAS_HEIGHT + 100) {
        pig.alive = false
        this.score += pig.score
        this.debugMsg = `PIG FELL OFF pos=(${Math.round(pig.body.position.x)},${Math.round(pig.body.position.y)})`
        this.debugTimer = 4
        this.deathMarkers.push({ x: pig.body.position.x, y: GROUND_Y, char: 'x_x' })
        this.physics.removeBody(pig.body)
        pigDied = true
      }
    }
    for (const block of this.blocks) {
      if (block.alive && block.body.position.y > CANVAS_HEIGHT + 100) {
        block.alive = false
        this.physics.removeBody(block.body)
      }
    }
    if (pigDied) this.checkGameEnd()
  }

  render(): void {
    const state: RenderState = {
      birds: this.birds,
      pigs: this.pigs,
      blocks: this.blocks,
      slingshot: this.slingshot,
      currentBird: this.currentBird,
      pullPosition: this.pullPosition,
      isDragging: this.isDragging,
      particles: this.particles.particles,
      score: this.score,
      level: this.level + 1,
      birdsLeft: this.birds.filter(b => b.alive && !b.launched).length,
      gameState: this.gameState,
      stars: this.stars,
      deathMarkers: this.deathMarkers,
      totalLevels: LEVELS.length,
      levelNames: LEVELS.map(l => l.name),
      currentBirdType: this.currentBird?.type ?? null,
      currentBirdAbilityUsed: this.currentBird?.abilityUsed ?? false,
      debugMsg: this.debugMode && this.debugTimer > 0 ? this.debugMsg : '',
      bgElements: this.bgElements,
      fieldChars: this.fieldChars,
    }
    this.renderer.render(state)
  }

  // 游戏主循环
  start(): void {
    let lastTime = performance.now()

    const loop = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05) // 限制最大 dt
      lastTime = now

      this.update(dt)
      this.render()

      requestAnimationFrame(loop)
    }

    requestAnimationFrame(loop)
  }

  // 更新力场论文文本
  setFieldText(text: string): void {
    this.fieldChars = createField(text)
  }
}
