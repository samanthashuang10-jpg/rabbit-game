'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Direction = 'up' | 'down' | 'left' | 'right'

interface Position {
  x: number
  y: number
}

interface Firework {
  x: number
  y: number
  color: string
  exploded: boolean
  particles: FireworkParticle[]
}

interface FireworkParticle {
  x: number
  y: number
  vx: number
  vy: number
  color: string
  life: number
  maxLife: number
}

const GRID_SIZE = 20
const CELL_SIZE = 20
const INITIAL_SPEED = 200

const FIREWORK_COLORS = [
  '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6b9d',
  '#c44569', '#f8b739', '#32e0c4', '#7bed9f', '#70a1ff',
  '#e056fd', '#ff7f50', '#2ed573', '#ffa502', '#3742fa'
]

export default function Home() {
  const [rabbit, setRabbit] = useState<Position[]>([{ x: 10, y: 10 }])
  const [carrot, setCarrot] = useState<Position>({ x: 15, y: 15 })
  const [direction, setDirection] = useState<Direction>('right')
  const [score, setScore] = useState(0)
  const [carrotCount, setCarrotCount] = useState(0)
  const [fireworkTriggerCount, setFireworkTriggerCount] = useState(0)
  const [fireworks, setFireworks] = useState<Firework[]>([])
  const [gameStatus, setGameStatus] = useState<'idle' | 'playing' | 'gameOver'>('idle')
  const [highScore, setHighScore] = useState(0)
  const gameLoopRef = useRef<number>()
  const directionRef = useRef<Direction>('right')
  const fireworksAnimationRef = useRef<number>()

  // 生成随机胡萝卜位置
  const generateCarrot = useCallback((rabbitBody: Position[]): Position => {
    const newCarrot: Position = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    }
    // 确保胡萝卜不在兔子上
    if (rabbitBody.some(segment => segment.x === newCarrot.x && segment.y === newCarrot.y)) {
      return generateCarrot(rabbitBody)
    }
    return newCarrot
  }, [])

  // 触发烟花
  const triggerFireworks = useCallback(() => {
    const newFireworks: Firework[] = []
    const canvasWidth = GRID_SIZE * CELL_SIZE
    const canvasHeight = GRID_SIZE * CELL_SIZE

    // 烟花数量翻倍：第一次3-5个，第二次6-10个，第三次12-20个...
    const baseFireworkCount = 3 + Math.floor(Math.random() * 3)
    const multiplier = Math.pow(2, fireworkTriggerCount)
    const fireworkCount = Math.min(baseFireworkCount * multiplier, 20) // 限制最大20个

    for (let i = 0; i < fireworkCount; i++) {
      const x = (canvasWidth / (fireworkCount + 1)) * (i + 1)
      const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)]
      newFireworks.push({
        x,
        y: canvasHeight,
        color,
        exploded: false,
        particles: []
      })
    }

    setFireworks(newFireworks)
    setFireworkTriggerCount(prev => prev + 1)
  }, [fireworkTriggerCount])

  // 更新烟花动画
  const updateFireworks = useCallback(() => {
    setFireworks(prevFireworks => {
      return prevFireworks.map(firework => {
        if (!firework.exploded) {
          // 烟花升空阶段
          const newY = firework.y - 3
          if (newY < 60 + Math.random() * 60) {
            // 爆炸
            const particles: FireworkParticle[] = []
            const particleCount = 30 + Math.floor(Math.random() * 20)

            for (let i = 0; i < particleCount; i++) {
              const angle = (Math.PI * 2 / particleCount) * i
              const speed = 2 + Math.random() * 3
              particles.push({
                x: firework.x,
                y: firework.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)],
                life: 60 + Math.floor(Math.random() * 30),
                maxLife: 60 + Math.floor(Math.random() * 30)
              })
            }

            return {
              ...firework,
              y: newY,
              exploded: true,
              particles
            }
          }
          return { ...firework, y: newY }
        } else {
          // 更新粒子
          const aliveParticles = firework.particles.map(particle => ({
            ...particle,
            x: particle.x + particle.vx,
            y: particle.y + particle.vy + 0.1, // 重力效果
            vx: particle.vx * 0.98,
            vy: particle.vy * 0.98,
            life: particle.life - 1
          })).filter(particle => particle.life > 0)

          return {
            ...firework,
            particles: aliveParticles
          }
        }
      }).filter(firework => {
        if (!firework.exploded) return firework.y > 50
        return firework.particles.length > 0
      })
    })
  }, [])

  // 烟花动画循环
  useEffect(() => {
    if (fireworks.length === 0) return

    const animate = () => {
      updateFireworks()
      if (fireworks.length > 0) {
        fireworksAnimationRef.current = requestAnimationFrame(animate)
      }
    }

    fireworksAnimationRef.current = requestAnimationFrame(animate)

    return () => {
      if (fireworksAnimationRef.current) {
        cancelAnimationFrame(fireworksAnimationRef.current)
      }
    }
  }, [fireworks.length, updateFireworks])

  // 检查碰撞
  const checkCollision = useCallback((head: Position, rabbitBody: Position[]): boolean => {
    // 撞墙
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      return true
    }
    // 撞自己
    return rabbitBody.some((segment, index) => index === 0 ? false : segment.x === head.x && segment.y === head.y)
  }, [])

  // 移动兔子
  const moveRabbit = useCallback(() => {
    setRabbit(prevRabbit => {
      const head = { ...prevRabbit[0] }
      const currentDirection = directionRef.current

      switch (currentDirection) {
        case 'up':
          head.y -= 1
          break
        case 'down':
          head.y += 1
          break
        case 'left':
          head.x -= 1
          break
        case 'right':
          head.x += 1
          break
      }

      // 检查碰撞
      if (checkCollision(head, prevRabbit)) {
        setGameStatus('gameOver')
        return prevRabbit
      }

      const newRabbit = [head, ...prevRabbit]

      // 检查是否吃到胡萝卜
      if (head.x === carrot.x && head.y === carrot.y) {
        setScore(prev => prev + 10)
        setCarrotCount(prev => {
          const newCount = prev + 1
          // 每3个胡萝卜触发烟花
          if (newCount % 3 === 0) {
            triggerFireworks()
          }
          return newCount
        })
        setCarrot(generateCarrot(newRabbit))
      } else {
        newRabbit.pop()
      }

      return newRabbit
    })
  }, [carrot, generateCarrot, checkCollision, triggerFireworks])

  // 游戏循环
  useEffect(() => {
    if (gameStatus !== 'playing') return

    gameLoopRef.current = window.setInterval(() => {
      moveRabbit()
    }, INITIAL_SPEED)

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
      }
    }
  }, [gameStatus, moveRabbit])

  // 更新最高分
  useEffect(() => {
    if (score > highScore && gameStatus === 'playing') {
      setHighScore(score)
    }
  }, [score, highScore, gameStatus])

  // 键盘控制
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStatus !== 'playing') return

      const currentDirection = directionRef.current

      switch (e.key) {
        case 'ArrowUp':
          if (currentDirection !== 'down') {
            directionRef.current = 'up'
            setDirection('up')
          }
          e.preventDefault()
          break
        case 'ArrowDown':
          if (currentDirection !== 'up') {
            directionRef.current = 'down'
            setDirection('down')
          }
          e.preventDefault()
          break
        case 'ArrowLeft':
          if (currentDirection !== 'right') {
            directionRef.current = 'left'
            setDirection('left')
          }
          e.preventDefault()
          break
        case 'ArrowRight':
          if (currentDirection !== 'left') {
            directionRef.current = 'right'
            setDirection('right')
          }
          e.preventDefault()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [gameStatus])

  // 开始游戏
  const startGame = () => {
    setRabbit([{ x: 10, y: 10 }])
    setCarrot({ x: 15, y: 15 })
    setDirection('right')
    directionRef.current = 'right'
    setScore(0)
    setCarrotCount(0)
    setFireworkTriggerCount(0)
    setFireworks([])
    setGameStatus('playing')
  }

  // 重新开始
  const restartGame = () => {
    setRabbit([{ x: 10, y: 10 }])
    setCarrot({ x: 15, y: 15 })
    setDirection('right')
    directionRef.current = 'right'
    setScore(0)
    setCarrotCount(0)
    setFireworkTriggerCount(0)
    setFireworks([])
    setGameStatus('playing')
  }

  const nextReward = 3 - (carrotCount % 3)

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 dark:from-purple-950 dark:via-pink-950 dark:to-orange-950 flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 bg-clip-text text-transparent">
            🐰 兔子吃胡萝卜
          </CardTitle>
          <CardDescription className="text-sm">
            使用方向键控制兔子的移动
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 分数和胡萝卜计数显示 */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm font-medium">
                🥕 胡萝卜
              </Badge>
              <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {carrotCount}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm font-medium">
                🎆 奖励
              </Badge>
              <span className="text-xl font-semibold text-purple-600 dark:text-purple-400">
                {Math.floor(carrotCount / 3)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm font-medium">
                最高分
              </Badge>
              <span className="text-xl font-semibold text-slate-600 dark:text-slate-400">
                {highScore}
              </span>
            </div>
          </div>

          {/* 奖励进度条 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">距离下一个烟花奖励</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">
                {nextReward === 3 ? '还差 3 个' : nextReward === 2 ? '还差 2 个' : nextReward === 1 ? '还差 1 个' : '🎉 即将触发！'}
              </span>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 transition-all duration-300"
                style={{ width: `${((3 - nextReward) / 3) * 100}%` }}
              />
            </div>
          </div>

          {/* 游戏画布 */}
          <div className="relative mx-auto">
            <canvas
              ref={(canvas) => {
                if (!canvas) return
                const ctx = canvas.getContext('2d')
                if (!ctx) return

                const canvasWidth = GRID_SIZE * CELL_SIZE
                const canvasHeight = GRID_SIZE * CELL_SIZE

                // 清空画布
                ctx.fillStyle = '#fef3c7'
                ctx.fillRect(0, 0, canvasWidth, canvasHeight)

                // 绘制草地纹理
                ctx.fillStyle = '#d4edda'
                for (let i = 0; i < 50; i++) {
                  const x = Math.random() * canvasWidth
                  const y = Math.random() * canvasHeight
                  ctx.beginPath()
                  ctx.arc(x, y, 2, 0, Math.PI * 2)
                  ctx.fill()
                }

                // 绘制网格
                ctx.strokeStyle = '#f0d8a8'
                ctx.lineWidth = 0.5
                for (let i = 0; i <= GRID_SIZE; i++) {
                  ctx.beginPath()
                  ctx.moveTo(i * CELL_SIZE, 0)
                  ctx.lineTo(i * CELL_SIZE, canvasHeight)
                  ctx.stroke()
                  ctx.beginPath()
                  ctx.moveTo(0, i * CELL_SIZE)
                  ctx.lineTo(canvasWidth, i * CELL_SIZE)
                  ctx.stroke()
                }

                // 绘制烟花
                fireworks.forEach(firework => {
                  if (!firework.exploded) {
                    // 绘制升空的烟花
                    ctx.fillStyle = firework.color
                    ctx.shadowColor = firework.color
                    ctx.shadowBlur = 15
                    ctx.beginPath()
                    ctx.arc(firework.x, firework.y, 3, 0, Math.PI * 2)
                    ctx.fill()
                    ctx.shadowBlur = 0

                    // 尾迹
                    ctx.fillStyle = firework.color + '80'
                    ctx.beginPath()
                    ctx.arc(firework.x, firework.y + 5, 2, 0, Math.PI * 2)
                    ctx.fill()
                  } else {
                    // 绘制爆炸粒子
                    firework.particles.forEach(particle => {
                      const alpha = particle.life / particle.maxLife
                      ctx.fillStyle = particle.color + Math.floor(alpha * 255).toString(16).padStart(2, '0')
                      ctx.shadowColor = particle.color
                      ctx.shadowBlur = 8 * alpha
                      ctx.beginPath()
                      ctx.arc(particle.x, particle.y, 2 * alpha, 0, Math.PI * 2)
                      ctx.fill()
                      ctx.shadowBlur = 0
                    })
                  }
                })

                // 绘制兔子身体
                rabbit.forEach((segment, index) => {
                  const x = segment.x * CELL_SIZE + CELL_SIZE / 2
                  const y = segment.y * CELL_SIZE + CELL_SIZE / 2

                  ctx.fillStyle = index === 0 ? '#ffffff' : '#f5f5f5'
                  ctx.shadowColor = '#e0e0e0'
                  ctx.shadowBlur = 3

                  ctx.beginPath()
                  ctx.arc(x, y, CELL_SIZE / 2 - 2, 0, Math.PI * 2)
                  ctx.fill()
                  ctx.shadowBlur = 0

                  // 兔子头部添加耳朵
                  if (index === 0) {
                    ctx.fillStyle = '#ffffff'
                    // 左耳
                    ctx.beginPath()
                    ctx.ellipse(x - 5, y - 12, 3, 8, -0.2, 0, Math.PI * 2)
                    ctx.fill()
                    // 右耳
                    ctx.beginPath()
                    ctx.ellipse(x + 5, y - 12, 3, 8, 0.2, 0, Math.PI * 2)
                    ctx.fill()
                    // 耳朵内部
                    ctx.fillStyle = '#ffc1cc'
                    ctx.beginPath()
                    ctx.ellipse(x - 5, y - 12, 1.5, 5, -0.2, 0, Math.PI * 2)
                    ctx.fill()
                    ctx.beginPath()
                    ctx.ellipse(x + 5, y - 12, 1.5, 5, 0.2, 0, Math.PI * 2)
                    ctx.fill()
                    // 眼睛
                    ctx.fillStyle = '#333333'
                    ctx.beginPath()
                    ctx.arc(x - 4, y - 2, 1.5, 0, Math.PI * 2)
                    ctx.fill()
                    ctx.beginPath()
                    ctx.arc(x + 4, y - 2, 1.5, 0, Math.PI * 2)
                    ctx.fill()
                    // 鼻子
                    ctx.fillStyle = '#ffc1cc'
                    ctx.beginPath()
                    ctx.arc(x, y + 2, 1.5, 0, Math.PI * 2)
                    ctx.fill()
                  }
                })

                // 绘制胡萝卜
                const carrotX = carrot.x * CELL_SIZE + CELL_SIZE / 2
                const carrotY = carrot.y * CELL_SIZE + CELL_SIZE / 2

                // 胡萝卜身体
                ctx.fillStyle = '#ff6b35'
                ctx.shadowColor = '#ff6b35'
                ctx.shadowBlur = 10
                ctx.beginPath()
                ctx.moveTo(carrotX - 5, carrotY + 5)
                ctx.lineTo(carrotX + 5, carrotY + 5)
                ctx.lineTo(carrotX + 4, carrotY - 8)
                ctx.lineTo(carrotX - 4, carrotY - 8)
                ctx.closePath()
                ctx.fill()
                ctx.shadowBlur = 0

                // 胡萝卜叶子
                ctx.fillStyle = '#4ade80'
                ctx.beginPath()
                ctx.moveTo(carrotX - 2, carrotY - 8)
                ctx.lineTo(carrotX - 5, carrotY - 14)
                ctx.lineTo(carrotX + 2, carrotY - 8)
                ctx.closePath()
                ctx.fill()

                ctx.beginPath()
                ctx.moveTo(carrotX + 2, carrotY - 8)
                ctx.lineTo(carrotX + 5, carrotY - 14)
                ctx.lineTo(carrotX - 2, carrotY - 8)
                ctx.closePath()
                ctx.fill()

                // 胡萝卜高光
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
                ctx.beginPath()
                ctx.ellipse(carrotX - 2, carrotY, 1.5, 3, -0.3, 0, Math.PI * 2)
                ctx.fill()
              }}
              width={GRID_SIZE * CELL_SIZE}
              height={GRID_SIZE * CELL_SIZE}
              className="border-4 border-orange-300 dark:border-orange-700 rounded-lg shadow-lg"
            />

            {/* 游戏状态覆盖层 */}
            {gameStatus === 'idle' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-lg">
                <div className="text-center space-y-4">
                  <p className="text-4xl mb-2">🐰</p>
                  <p className="text-white text-lg font-semibold">帮助小兔子收集胡萝卜！</p>
                  <p className="text-orange-300 text-sm">每吃 3 个胡萝卜触发烟花 🎆</p>
                  <Button onClick={startGame} size="lg" className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 hover:from-purple-700 hover:via-pink-700 hover:to-orange-700">
                    开始游戏
                  </Button>
                </div>
              </div>
            )}

            {gameStatus === 'gameOver' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm rounded-lg">
                <div className="text-center space-y-4">
                  <p className="text-4xl mb-2">😢</p>
                  <p className="text-3xl font-bold text-red-500 mb-2">游戏结束</p>
                  <p className="text-white text-lg">收集了 {carrotCount} 个胡萝卜</p>
                  <p className="text-orange-300">触发了 {Math.floor(carrotCount / 3)} 次烟花奖励</p>
                  <Button onClick={restartGame} size="lg" className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 hover:from-purple-700 hover:via-pink-700 hover:to-orange-700">
                    重新开始
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 控制按钮 */}
          <div className="flex justify-center gap-3">
            {gameStatus === 'idle' && (
              <Button onClick={startGame} className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 hover:from-purple-700 hover:via-pink-700 hover:to-orange-700 min-w-32">
                开始游戏
              </Button>
            )}
            {gameStatus === 'playing' && (
              <Button
                onClick={() => setGameStatus('gameOver')}
                variant="destructive"
                className="min-w-32"
              >
                结束游戏
              </Button>
            )}
            {gameStatus === 'gameOver' && (
              <Button onClick={restartGame} className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 hover:from-purple-700 hover:via-pink-700 hover:to-orange-700 min-w-32">
                重新开始
              </Button>
            )}
          </div>

          {/* 操作提示 */}
          <div className="text-center text-xs text-slate-500 dark:text-slate-400">
            <p className="mb-1">使用 ↑ ↓ ← → 方向键控制兔子的移动</p>
            <p>吃到胡萝卜 🥕 兔子会变长，每 3 个胡萝卜触发烟花 🎆</p>
          </div>
        </CardContent>
      </Card>

      <footer className="mt-auto py-4 text-center text-sm text-slate-500 dark:text-slate-400">
        <p>🐰 兔子吃胡萝卜游戏 - 收集胡萝卜，欣赏烟花！</p>
      </footer>
    </div>
  )
}
