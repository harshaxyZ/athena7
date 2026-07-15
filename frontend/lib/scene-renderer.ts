/**
 * Athena Cinematic Renderer — reads Scene JSON and produces premium 2D animation.
 *
 * Architecture: The LLM outputs Scene JSON (what to teach). This renderer owns
 * all visual quality: composition, layout, colors, typography, spacing, camera,
 * easing, transitions, and animation polish. The LLM never touches pixels.
 *
 * Design Principles:
 * - Every scene understandable within 3 seconds
 * - Visually balanced, smooth, cinematic, readable
 * - Feels handcrafted, not AI-generated
 * - Presentation-quality when paused
 * - Extensible: new scene types = new renderSceneType function + registry entry
 */

// ─── Design System ────────────────────────────────────────────────
// All visual constants. The LLM never generates these.

type ThemeColors = { bg: string; bgAlt: string; text: string; textSecondary: string; border: string; card: string }

const THEMES: Record<string, ThemeColors> = {
  light: {
    bg: "#ffffff",
    bgAlt: "#f8fafc",
    text: "#1e293b",
    textSecondary: "#64748b",
    border: "#e2e8f0",
    card: "#f1f5f9",
  },
  dark: {
    bg: "#0f172a",
    bgAlt: "#1e293b",
    text: "#f8fafc",
    textSecondary: "#94a3b8",
    border: "#334155",
    card: "#1e293b",
  },
}

const ACCENT_COLORS = ["#14b8a6", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#22c55e", "#ec4899"]

const FONTS = {
  title: "bold 42px Inter, system-ui, sans-serif",
  subtitle: "24px Inter, system-ui, sans-serif",
  body: "20px Inter, system-ui, sans-serif",
  label: "bold 18px Inter, system-ui, sans-serif",
  small: "16px Inter, system-ui, sans-serif",
  counter: "bold 72px Inter, system-ui, sans-serif",
} as const

const SPACING = {
  margin: 80,
  gap: 32,
  cardPadding: 24,
  cardRadius: 16,
  cardGap: 20,
  lineHeight: 1.5,
} as const

const MOTION = {
  stagger: 0.08,
  hold: 0.4,
  enterDuration: 0.6,
  exitDuration: 0.3,
  cameraSpeed: 0.008,
} as const

// ─── Position Resolver ────────────────────────────────────────────
// Converts semantic positions to pixel coordinates.

type CanvasSize = { width: number; height: number }

function resolvePos(pos: string | undefined, canvas: CanvasSize, idx?: number, total?: number): { x: number; y: number } {
  const m = SPACING.margin
  const cx = canvas.width / 2
  const cy = canvas.height / 2
  const map: Record<string, { x: number; y: number }> = {
    center: { x: cx, y: cy },
    left: { x: m + 200, y: cy },
    right: { x: canvas.width - m - 200, y: cy },
    top: { x: cx, y: m + 100 },
    bottom: { x: cx, y: canvas.height - m - 100 },
    "top-left": { x: m + 200, y: m + 80 },
    "top-right": { x: canvas.width - m - 200, y: m + 80 },
    "bottom-left": { x: m + 200, y: canvas.height - m - 80 },
    "bottom-right": { x: canvas.width - m - 200, y: canvas.height - m - 80 },
    "left-third": { x: canvas.width * 0.33, y: cy },
    "right-third": { x: canvas.width * 0.67, y: cy },
    "full-width": { x: cx, y: cy },
  }
  return map[pos || "center"] || map.center
}

function accentColor(idx: number): string {
  return ACCENT_COLORS[idx % ACCENT_COLORS.length]
}

// ─── Primitive Renderers ───────────────────────────────────────────
// Low-level drawing functions used by scene types.

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  r: number, fill: string, stroke?: string
) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  if (fill) { ctx.fillStyle = fill; ctx.fill() }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke() }
}

function drawLeaderLine(
  ctx: CanvasRenderingContext2D,
  fromX: number, fromY: number,
  toX: number, toY: number,
  color: string
) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  ctx.setLineDash([6, 4])
  ctx.beginPath()
  ctx.moveTo(fromX, fromY)
  ctx.lineTo(toX, toY)
  ctx.stroke()
  ctx.setLineDash([])
  // Small dot at start
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(fromX, fromY, 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number, fromY: number,
  toX: number, toY: number,
  color: string, dashed?: boolean
) {
  const headLen = 12
  const angle = Math.atan2(toY - fromY, toX - fromX)
  ctx.save()
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 3
  if (dashed) ctx.setLineDash([8, 5])
  ctx.beginPath()
  ctx.moveTo(fromX, fromY)
  ctx.lineTo(toX, toY)
  ctx.stroke()
  ctx.setLineDash([])
  // Arrowhead
  ctx.beginPath()
  ctx.moveTo(toX, toY)
  ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6))
  ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6))
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function measureText(ctx: CanvasRenderingContext2D, text: string, font: string): { width: number; height: number } {
  ctx.save()
  ctx.font = font
  const m = ctx.measureText(text)
  ctx.restore()
  return { width: m.width, height: parseInt(font) || 20 }
}

// ─── Scene Type Renderers ──────────────────────────────────────────
// Each scene type is a function. To add a new scene type:
// 1. Create a renderSceneType_XYZ function here
// 2. Register it in SCENE_RENDERERS below

type SceneRenderFn = (
  ctx: CanvasRenderingContext2D,
  data: Record<string, unknown>,
  canvas: CanvasSize,
  progress: number, // 0-1
  colorIdx: number,
) => void

function renderHero(
  ctx: CanvasRenderingContext2D,
  data: Record<string, unknown>,
  canvas: CanvasSize,
  progress: number,
  colorIdx: number,
) {
  const title = String(data.title || "Title")
  const subtitle = String(data.subtitle || "")
  const color = accentColor(colorIdx)

  // Centered composition
  const titleY = canvas.height * 0.38
  const subY = titleY + 70

  // Title
  ctx.save()
  ctx.globalAlpha = Math.min(1, progress * 3)
  ctx.font = FONTS.title
  ctx.fillStyle = THEMES.light.text
  ctx.textAlign = "center"
  const titleOffset = (1 - Math.min(1, progress * 2.5)) * 40
  ctx.fillText(title, canvas.width / 2, titleY + titleOffset)
  ctx.restore()

  // Accent line under title
  if (progress > 0.15) {
    const lineProgress = Math.min(1, (progress - 0.15) * 3)
    const titleW = measureText(ctx, title, FONTS.title).width
    const lineW = titleW * 0.6 * lineProgress
    ctx.save()
    ctx.strokeStyle = color
    ctx.lineWidth = 4
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(canvas.width / 2 - lineW / 2, titleY + 20)
    ctx.lineTo(canvas.width / 2 + lineW / 2, titleY + 20)
    ctx.stroke()
    ctx.restore()
  }

  // Subtitle
  if (subtitle && progress > 0.25) {
    const subProgress = Math.min(1, (progress - 0.25) * 3)
    ctx.save()
    ctx.globalAlpha = subProgress
    ctx.font = FONTS.subtitle
    ctx.fillStyle = THEMES.light.textSecondary
    ctx.textAlign = "center"
    const subOffset = (1 - subProgress) * 20
    ctx.fillText(subtitle, canvas.width / 2, subY + subOffset)
    ctx.restore()
  }
}

function renderFlowDiagram(
  ctx: CanvasRenderingContext2D,
  data: Record<string, unknown>,
  canvas: CanvasSize,
  progress: number,
  colorIdx: number,
) {
  const title = String(data.title || "")
  const steps = (data.steps || []) as Array<{ label: string; description?: string }>
  const direction = String(data.direction || "horizontal")

  if (steps.length === 0) return

  // Title
  if (progress > 0) {
    ctx.save()
    ctx.globalAlpha = Math.min(1, progress * 4)
    ctx.font = FONTS.title
    ctx.fillStyle = THEMES.light.text
    ctx.textAlign = "left"
    ctx.fillText(title, SPACING.margin, SPACING.margin + 30)
    // Accent underline
    const tw = measureText(ctx, title, FONTS.title).width
    ctx.strokeStyle = accentColor(colorIdx)
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(SPACING.margin, SPACING.margin + 45)
    ctx.lineTo(SPACING.margin + tw * Math.min(1, progress * 3), SPACING.margin + 45)
    ctx.stroke()
    ctx.restore()
  }

  const isHorizontal = direction === "horizontal"
  const contentY = SPACING.margin + 100
  const contentH = canvas.height - contentY - SPACING.margin - 40
  const contentW = canvas.width - SPACING.margin * 2

  // Calculate box positions
  const boxW = isHorizontal ? Math.min(180, (contentW - (steps.length - 1) * SPACING.gap) / steps.length) : contentW * 0.6
  const boxH = isHorizontal ? contentH * 0.35 : Math.min(60, (contentH - (steps.length - 1) * SPACING.gap) / steps.length)
  const totalStepSize = isHorizontal
    ? steps.length * boxW + (steps.length - 1) * SPACING.gap
    : steps.length * boxH + (steps.length - 1) * SPACING.gap
  const startOffset = isHorizontal
    ? (contentW - totalStepSize) / 2
    : (contentH - totalStepSize) / 2

  const positions: Array<{ x: number; y: number; cx: number; cy: number }> = []

  steps.forEach((step, i) => {
    const stepProgress = Math.max(0, Math.min(1, (progress - 0.15 - i * MOTION.stagger) * 3))
    if (stepProgress <= 0) return

    let bx: number, by: number
    if (isHorizontal) {
      bx = SPACING.margin + startOffset + i * (boxW + SPACING.gap)
      by = contentY + (contentH - boxH) / 2
    } else {
      bx = (contentW - boxW) / 2 + SPACING.margin
      by = contentY + startOffset + i * (boxH + SPACING.gap)
    }

    const cx = bx + boxW / 2
    const cy = by + boxH / 2
    positions.push({ x: bx, y: by, cx, cy })

    const color = accentColor(colorIdx + i)
    const scale = 0.8 + 0.2 * stepProgress

    ctx.save()
    ctx.globalAlpha = stepProgress
    ctx.translate(cx, cy)
    ctx.scale(scale, scale)
    ctx.translate(-cx, -cy)

    // Box
    drawRoundedRect(ctx, bx, by, boxW, boxH, SPACING.cardRadius, color + "15", color)

    // Step number circle
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(bx + 24, cy, 16, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 14px Inter"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(String(i + 1), bx + 24, cy)

    // Label
    ctx.fillStyle = THEMES.light.text
    ctx.font = FONTS.label
    ctx.textAlign = "left"
    ctx.textBaseline = "middle"
    ctx.fillText(step.label, bx + 50, cy)

    ctx.restore()
  })

  // Draw arrows between steps
  for (let i = 0; i < positions.length - 1; i++) {
    const arrowProgress = Math.max(0, Math.min(1, (progress - 0.3 - i * MOTION.stagger) * 3))
    if (arrowProgress <= 0) continue

    const from = positions[i]
    const to = positions[i + 1]
    ctx.save()
    ctx.globalAlpha = arrowProgress
    if (isHorizontal) {
      drawArrow(ctx, from.x + boxW + 4, from.cy, to.x - 4, to.cy, THEMES.light.textSecondary)
    } else {
      drawArrow(ctx, from.cx, from.y + boxH + 4, to.cx, to.y - 4, THEMES.light.textSecondary)
    }
    ctx.restore()
  }
}

function renderTimeline(
  ctx: CanvasRenderingContext2D,
  data: Record<string, unknown>,
  canvas: CanvasSize,
  progress: number,
  colorIdx: number,
) {
  const title = String(data.title || "")
  const events = (data.events || []) as Array<{ time: string; label: string; description?: string }>

  if (events.length === 0) return

  // Title
  if (progress > 0) {
    ctx.save()
    ctx.globalAlpha = Math.min(1, progress * 4)
    ctx.font = FONTS.title
    ctx.fillStyle = THEMES.light.text
    ctx.textAlign = "left"
    ctx.fillText(title, SPACING.margin, SPACING.margin + 30)
    ctx.restore()
  }

  const contentY = SPACING.margin + 120
  const contentH = canvas.height - contentY - SPACING.margin
  const lineX = SPACING.margin + 40
  const lineTop = contentY + 20
  const lineBottom = contentY + contentH - 20

  // Vertical line
  const lineProgress = Math.min(1, progress * 2)
  ctx.save()
  ctx.strokeStyle = THEMES.light.border
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(lineX, lineTop)
  ctx.lineTo(lineX, lineTop + (lineBottom - lineTop) * lineProgress)
  ctx.stroke()
  ctx.restore()

  // Events
  const spacing = (lineBottom - lineTop) / Math.max(1, events.length - 1 || 1)

  events.forEach((event, i) => {
    const eventProgress = Math.max(0, Math.min(1, (progress - 0.2 - i * MOTION.stagger) * 3))
    if (eventProgress <= 0) return

    const y = lineTop + i * spacing
    const color = accentColor(colorIdx + i)
    const dotX = lineX
    const textX = lineX + 40

    ctx.save()
    ctx.globalAlpha = eventProgress

    // Dot on timeline
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(dotX, y, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#ffffff"
    ctx.beginPath()
    ctx.arc(dotX, y, 3, 0, Math.PI * 2)
    ctx.fill()

    // Time label
    ctx.font = FONTS.small
    ctx.fillStyle = color
    ctx.textAlign = "left"
    ctx.textBaseline = "middle"
    ctx.fillText(event.time, textX, y - 14)

    // Event label
    ctx.font = FONTS.label
    ctx.fillStyle = THEMES.light.text
    ctx.fillText(event.label, textX, y + 6)

    // Description
    if (event.description) {
      ctx.font = FONTS.small
      ctx.fillStyle = THEMES.light.textSecondary
      ctx.fillText(event.description, textX, y + 28)
    }

    ctx.restore()
  })
}

function renderMechanism(
  ctx: CanvasRenderingContext2D,
  data: Record<string, unknown>,
  canvas: CanvasSize,
  progress: number,
  colorIdx: number,
) {
  const title = String(data.title || "")
  const parts = (data.parts || []) as Array<{ label: string; description?: string; position?: string }>
  const connections = (data.connections || []) as Array<{ from: string; to: string; label?: string }>

  // Title
  if (progress > 0) {
    ctx.save()
    ctx.globalAlpha = Math.min(1, progress * 4)
    ctx.font = FONTS.title
    ctx.fillStyle = THEMES.light.text
    ctx.textAlign = "left"
    ctx.fillText(title, SPACING.margin, SPACING.margin + 30)
    ctx.restore()
  }

  // Position parts in a grid layout
  const contentY = SPACING.margin + 100
  const cols = Math.min(3, parts.length)
  const rows = Math.ceil(parts.length / cols)
  const cellW = (canvas.width - SPACING.margin * 2) / cols
  const cellH = (canvas.height - contentY - SPACING.margin) / rows

  const partPositions: Record<string, { cx: number; cy: number }> = {}

  parts.forEach((part, i) => {
    const partProgress = Math.max(0, Math.min(1, (progress - 0.15 - i * MOTION.stagger) * 3))
    if (partProgress <= 0) return

    const col = i % cols
    const row = Math.floor(i / cols)
    const cx = SPACING.margin + col * cellW + cellW / 2
    const cy = contentY + row * cellH + cellH / 2
    partPositions[part.label] = { cx, cy }

    const color = accentColor(colorIdx + i)
    const boxW = cellW * 0.75
    const boxH = cellH * 0.55

    ctx.save()
    ctx.globalAlpha = partProgress
    const scale = 0.85 + 0.15 * partProgress
    ctx.translate(cx, cy)
    ctx.scale(scale, scale)
    ctx.translate(-cx, -cy)

    // Card
    drawRoundedRect(ctx, cx - boxW / 2, cy - boxH / 2, boxW, boxH, SPACING.cardRadius, color + "12", color)

    // Label
    ctx.fillStyle = THEMES.light.text
    ctx.font = FONTS.label
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(part.label, cx, cy - 8)

    // Description
    if (part.description) {
      ctx.font = FONTS.small
      ctx.fillStyle = THEMES.light.textSecondary
      ctx.fillText(part.description, cx, cy + 18)
    }

    ctx.restore()
  })

  // Draw connections
  if (progress > 0.4) {
    const connProgress = Math.min(1, (progress - 0.4) * 2.5)
    connections.forEach((conn) => {
      const from = partPositions[conn.from]
      const to = partPositions[conn.to]
      if (!from || !to) return

      ctx.save()
      ctx.globalAlpha = connProgress
      drawArrow(ctx, from.cx, from.cy + 30, to.cx, to.cy - 30, THEMES.light.textSecondary)

      if (conn.label) {
        const mx = (from.cx + to.cx) / 2
        const my = (from.cy + to.cy) / 2
        ctx.font = FONTS.small
        ctx.fillStyle = THEMES.light.textSecondary
        ctx.textAlign = "center"
        ctx.fillText(conn.label, mx + 15, my)
      }
      ctx.restore()
    })
  }
}

function renderComparison(
  ctx: CanvasRenderingContext2D,
  data: Record<string, unknown>,
  canvas: CanvasSize,
  progress: number,
  colorIdx: number,
) {
  const title = String(data.title || "")
  const left = (data.left || {}) as { heading?: string; items?: string[] }
  const right = (data.right || {}) as { heading?: string; items?: string[] }

  // Title
  if (progress > 0) {
    ctx.save()
    ctx.globalAlpha = Math.min(1, progress * 4)
    ctx.font = FONTS.title
    ctx.fillStyle = THEMES.light.text
    ctx.textAlign = "center"
    ctx.fillText(title, canvas.width / 2, SPACING.margin + 30)
    ctx.restore()
  }

  const contentY = SPACING.margin + 80
  const halfW = (canvas.width - SPACING.margin * 2 - SPACING.gap) / 2
  const cardH = canvas.height - contentY - SPACING.margin

  // Left card
  const leftProgress = Math.min(1, progress * 2.5)
  if (leftProgress > 0) {
    ctx.save()
    ctx.globalAlpha = leftProgress
    const lx = SPACING.margin
    drawRoundedRect(ctx, lx, contentY, halfW, cardH, SPACING.cardRadius, THEMES.light.card, THEMES.light.border)

    if (left.heading) {
      ctx.font = FONTS.subtitle
      ctx.fillStyle = accentColor(colorIdx)
      ctx.textAlign = "left"
      ctx.fillText(left.heading, lx + SPACING.cardPadding, contentY + 45)
    }
    ;(left.items || []).forEach((item, i) => {
      const itemProgress = Math.max(0, Math.min(1, (progress - 0.2 - i * MOTION.stagger) * 3))
      if (itemProgress <= 0) return
      ctx.globalAlpha = leftProgress * itemProgress
      ctx.font = FONTS.body
      ctx.fillStyle = THEMES.light.text
      ctx.fillText(`• ${item}`, lx + SPACING.cardPadding, contentY + 90 + i * 36)
    })
    ctx.restore()
  }

  // Right card
  const rightProgress = Math.min(1, Math.max(0, (progress - 0.1) * 2.5))
  if (rightProgress > 0) {
    ctx.save()
    ctx.globalAlpha = rightProgress
    const rx = SPACING.margin + halfW + SPACING.gap
    drawRoundedRect(ctx, rx, contentY, halfW, cardH, SPACING.cardRadius, THEMES.light.card, THEMES.light.border)

    if (right.heading) {
      ctx.font = FONTS.subtitle
      ctx.fillStyle = accentColor(colorIdx + 1)
      ctx.textAlign = "left"
      ctx.fillText(right.heading, rx + SPACING.cardPadding, contentY + 45)
    }
    ;(right.items || []).forEach((item, i) => {
      const itemProgress = Math.max(0, Math.min(1, (progress - 0.3 - i * MOTION.stagger) * 3))
      if (itemProgress <= 0) return
      ctx.globalAlpha = rightProgress * itemProgress
      ctx.font = FONTS.body
      ctx.fillStyle = THEMES.light.text
      ctx.fillText(`• ${item}`, rx + SPACING.cardPadding, contentY + 90 + i * 36)
    })
    ctx.restore()
  }

  // VS divider
  if (progress > 0.15) {
    const vsProgress = Math.min(1, (progress - 0.15) * 4)
    ctx.save()
    ctx.globalAlpha = vsProgress
    ctx.font = "bold 28px Inter"
    ctx.fillStyle = THEMES.light.textSecondary
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText("VS", canvas.width / 2, contentY + cardH / 2)
    ctx.restore()
  }
}

function renderSummary(
  ctx: CanvasRenderingContext2D,
  data: Record<string, unknown>,
  canvas: CanvasSize,
  progress: number,
  colorIdx: number,
) {
  const title = String(data.title || "Key Takeaways")
  const takeaways = (data.takeaways || []) as Array<{ label: string; description?: string }>

  // Title
  if (progress > 0) {
    ctx.save()
    ctx.globalAlpha = Math.min(1, progress * 4)
    ctx.font = FONTS.title
    ctx.fillStyle = THEMES.light.text
    ctx.textAlign = "center"
    ctx.fillText(title, canvas.width / 2, SPACING.margin + 40)
    ctx.restore()
  }

  const contentY = SPACING.margin + 100
  const cols = Math.min(3, takeaways.length)
  const rows = Math.ceil(takeaways.length / cols)
  const cellW = (canvas.width - SPACING.margin * 2) / cols
  const cellH = Math.min(140, (canvas.height - contentY - SPACING.margin) / rows)

  takeaways.forEach((item, i) => {
    const itemProgress = Math.max(0, Math.min(1, (progress - 0.15 - i * MOTION.stagger) * 3))
    if (itemProgress <= 0) return

    const col = i % cols
    const row = Math.floor(i / cols)
    const cx = SPACING.margin + col * cellW + cellW / 2
    const cy = contentY + row * cellH + cellH / 2
    const color = accentColor(colorIdx + i)

    ctx.save()
    ctx.globalAlpha = itemProgress
    const scale = 0.9 + 0.1 * itemProgress
    ctx.translate(cx, cy)
    ctx.scale(scale, scale)
    ctx.translate(-cx, -cy)

    // Number badge
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(cx, cy - 30, 20, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = "#ffffff"
    ctx.font = "bold 16px Inter"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(String(i + 1), cx, cy - 30)

    // Label
    ctx.fillStyle = THEMES.light.text
    ctx.font = FONTS.label
    ctx.fillText(item.label, cx, cy + 8)

    // Description
    if (item.description) {
      ctx.font = FONTS.small
      ctx.fillStyle = THEMES.light.textSecondary
      ctx.fillText(item.description, cx, cy + 32)
    }

    ctx.restore()
  })
}

// ─── Scene Type Registry ───────────────────────────────────────────
// Add new scene types here. To extend: add entry to SCENE_RENDERERS.

const SCENE_RENDERERS: Record<string, SceneRenderFn> = {
  Hero: renderHero,
  FlowDiagram: renderFlowDiagram,
  Timeline: renderTimeline,
  Mechanism: renderMechanism,
  Comparison: renderComparison,
  Summary: renderSummary,
  // Fallback: render as Hero if unknown type
}

// ─── Cinematic Effects ─────────────────────────────────────────────
// Applied to every scene for free. Zero LLM cost.

function applyVignette(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const gradient = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.75)
  gradient.addColorStop(0, "rgba(0,0,0,0)")
  gradient.addColorStop(1, "rgba(0,0,0,0.15)")
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, w, h)
}

function applyGrain(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data
  const seed = (time * 1000) | 0
  for (let i = 0; i < data.length; i += 16) { // Skip pixels for performance
    const noise = ((seed + i * 9301 + 49297) % 233280) / 233280
    const grain = (noise - 0.5) * 12
    data[i] = Math.min(255, Math.max(0, data[i] + grain))
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + grain))
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + grain))
  }
  ctx.putImageData(imageData, 0, 0)
}

function applyCameraDrift(
  ctx: CanvasRenderingContext2D,
  w: number, h: number,
  camera: Record<string, unknown> | undefined,
  time: number,
  sceneDuration: number,
) {
  if (!camera || camera.type === "static") return

  const intensity = (Number(camera.intensity) || 0.15) * 0.5
  const type = String(camera.type || "static")

  ctx.save()
  ctx.translate(w / 2, h / 2)

  switch (type) {
    case "pushIn": {
      const zoom = 1 + intensity * Math.min(1, time / sceneDuration)
      ctx.scale(zoom, zoom)
      break
    }
    case "pullOut": {
      const zoom = 1 + intensity - intensity * Math.min(1, time / sceneDuration)
      ctx.scale(zoom, zoom)
      break
    }
    case "pan": {
      const dx = Math.sin(time * MOTION.cameraSpeed) * intensity * 50
      ctx.translate(dx, 0)
      break
    }
    case "orbit": {
      const angle = time * MOTION.cameraSpeed * 0.5
      const dx = Math.cos(angle) * intensity * 30
      const dy = Math.sin(angle) * intensity * 20
      ctx.translate(dx, dy)
      break
    }
    case "zoom": {
      const zoom = 1 + Math.sin(time * MOTION.cameraSpeed) * intensity * 0.5
      ctx.scale(zoom, zoom)
      break
    }
    case "tilt": {
      const angle = Math.sin(time * MOTION.cameraSpeed) * intensity * 0.02
      ctx.rotate(angle)
      break
    }
    case "focusShift": {
      const dy = Math.sin(time * MOTION.cameraSpeed) * intensity * 20
      ctx.translate(0, dy)
      break
    }
  }

  ctx.translate(-w / 2, -h / 2)
}

// ─── Main Render Entry Point ───────────────────────────────────────

export function renderScene(
  canvas: HTMLCanvasElement,
  sceneJSON: Record<string, unknown>,
  onProgress?: (time: number, subtitle: string) => void,
): { stop: () => void; duration: number } {
  const ctx = canvas.getContext("2d")!
  const dpr = window.devicePixelRatio || 1
  const displayW = canvas.clientWidth || 1200
  const displayH = canvas.clientHeight || 675

  // Set explicit canvas dimensions
  canvas.width = displayW * dpr
  canvas.height = displayH * dpr
  canvas.style.width = displayW + "px"
  canvas.style.height = displayH + "px"
  ctx.scale(dpr, dpr)

  const canvasSize = { width: displayW, height: displayH }
  const theme = String(sceneJSON.theme || "light")
  const palette = THEMES[theme] || THEMES.light
  const scenes = (sceneJSON.scenes || []) as Array<Record<string, unknown>>

  // Ensure minimum 60 seconds
  const rawDuration = Number(sceneJSON.totalDuration) || scenes.reduce((sum, s) => sum + (Number(s.duration) || 10), 0)
  const totalDuration = Math.max(60, rawDuration)

  console.log("[Athena Renderer] Starting:", { w: displayW, h: displayH, scenes: scenes.length, totalDuration, theme })

  // Build beat timeline
  const allBeats: Array<{ time: number; subtitle: string }> = []
  let timeOffset = 0
  scenes.forEach((scene) => {
    const beats = (scene.beats || []) as Array<{ time: number; subtitle: string }>
    beats.forEach((b) => allBeats.push({ time: (Number(b.time) || 0) + timeOffset, subtitle: b.subtitle || "" }))
    timeOffset += Number(scene.duration) || 10
  })
  allBeats.sort((a, b) => a.time - b.time)

  // Build scene timeline
  const sceneTimeline: Array<{ start: number; end: number; scene: Record<string, unknown> }> = []
  let cumulative = 0
  scenes.forEach((scene) => {
    const dur = Number(scene.duration) || 10
    sceneTimeline.push({ start: cumulative, end: cumulative + dur, scene })
    cumulative += dur
  })

  let running = true
  let startTime = performance.now() / 1000
  let frameCount = 0

  function renderFrame() {
    if (!running) return

    try {
      const elapsed = (performance.now() / 1000 - startTime)
      const time = elapsed % totalDuration
      frameCount++

      // Clear with white background
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, displayW, displayH)

      // Find current scene
      const current = sceneTimeline.find((s) => time >= s.start && time < s.end)
      if (current) {
        const sceneTime = time - current.start
        const sceneDuration = current.end - current.start
        const progress = Math.min(1, sceneTime / sceneDuration)

        // Apply camera drift (subtle)
        ctx.save()
        applyCameraDrift(ctx, displayW, displayH, current.scene.camera as Record<string, unknown>, sceneTime, sceneDuration)

        // Render scene type
        const sceneType = String(current.scene.type || "Hero")
        const renderer = SCENE_RENDERERS[sceneType] || SCENE_RENDERERS.Hero
        renderer(ctx, (current.scene.data || {}) as Record<string, unknown>, canvasSize, progress, sceneTimeline.indexOf(current))

        ctx.restore()
      }

      // Update subtitle via callback
      if (onProgress) {
        const activeBeat = [...allBeats].reverse().find((b) => b.time <= time)
        onProgress(time, activeBeat?.subtitle || "")
      }
    } catch (err) {
      // Show error on canvas instead of silent failure
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, displayW, displayH)
      ctx.fillStyle = "#ef4444"
      ctx.font = "bold 24px Inter, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("Rendering error: " + String(err), displayW / 2, displayH / 2)
      console.error("[Athena Renderer]", err)
    }

    requestAnimationFrame(renderFrame)
  }

  requestAnimationFrame(renderFrame)

  return {
    stop: () => { running = false },
    duration: totalDuration,
  }
}
