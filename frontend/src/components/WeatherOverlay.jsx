import { useEffect, useRef } from 'react'

export default function WeatherOverlay({ weather }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    if (!weather) return
    const { condition, wind = 0 } = weather
    if (!['rain', 'storm', 'snow', 'fog'].includes(condition)) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // --- Rain / Storm ---
    if (condition === 'rain' || condition === 'storm') {
      const drops = Array.from({ length: condition === 'storm' ? 220 : 140 }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        len: 10 + Math.random() * 18,
        speed: 8 + Math.random() * 10,
        opacity: 0.12 + Math.random() * 0.2,
      }))
      const angle = Math.min(wind / 30, 0.35) // drift with wind
      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        drops.forEach(d => {
          ctx.beginPath()
          ctx.moveTo(d.x, d.y)
          ctx.lineTo(d.x + Math.sin(angle) * d.len, d.y + Math.cos(angle) * d.len)
          ctx.strokeStyle = `rgba(180,200,220,${d.opacity})`
          ctx.lineWidth = 0.8
          ctx.stroke()
          d.y += d.speed
          d.x += Math.sin(angle) * d.speed * 0.4
          if (d.y > canvas.height) { d.y = -20; d.x = Math.random() * canvas.width }
          if (d.x > canvas.width)  { d.x = 0 }
        })
        rafRef.current = requestAnimationFrame(draw)
      }
      draw()
    }

    // --- Snow ---
    if (condition === 'snow') {
      const flakes = Array.from({ length: 120 }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: 1 + Math.random() * 2.5,
        speed: 0.6 + Math.random() * 1.4,
        drift: (Math.random() - 0.5) * 0.6,
        opacity: 0.4 + Math.random() * 0.45,
      }))
      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        flakes.forEach(f => {
          ctx.beginPath()
          ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(220,235,255,${f.opacity})`
          ctx.fill()
          f.y += f.speed
          f.x += f.drift
          if (f.y > canvas.height) { f.y = -5; f.x = Math.random() * canvas.width }
        })
        rafRef.current = requestAnimationFrame(draw)
      }
      draw()
    }

    // --- Fog ---
    if (condition === 'fog') {
      let t = 0
      const draw = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const pulse = 0.06 + Math.sin(t * 0.003) * 0.02
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
        grad.addColorStop(0,   `rgba(160,165,170,${pulse + 0.04})`)
        grad.addColorStop(0.4, `rgba(140,145,150,${pulse})`)
        grad.addColorStop(1,   `rgba(160,165,170,${pulse + 0.03})`)
        ctx.fillStyle = grad
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        t++
        rafRef.current = requestAnimationFrame(draw)
      }
      draw()
    }

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [weather])

  if (!weather || !['rain', 'storm', 'snow', 'fog'].includes(weather.condition)) return null

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 2,
        opacity: weather.condition === 'fog' ? 0.7 : 1,
      }}
    />
  )
}
