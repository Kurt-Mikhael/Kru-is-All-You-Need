"use client"

import createGlobe, { COBEOptions } from "cobe"
import { useCallback, useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type GlobeRenderState = {
  phi?: number
  width?: number
  height?: number
}

type GlobeConfig = COBEOptions & {
  onRender: (state: GlobeRenderState) => void
}

const GLOBE_CONFIG: GlobeConfig = {
  width: 800,
  height: 800,
  onRender: () => {},
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.3,
  dark: 0,
  diffuse: 0.4,
  mapSamples: 16000,
  mapBrightness: 1.2,
  baseColor: [1, 1, 1],
  markerColor: [251 / 255, 100 / 255, 21 / 255],
  glowColor: [1, 1, 1],
  markers: [
    { location: [14.5995, 120.9842], size: 0.03 },
    { location: [19.076, 72.8777], size: 0.1 },
    { location: [23.8103, 90.4125], size: 0.05 },
    { location: [30.0444, 31.2357], size: 0.07 },
    { location: [39.9042, 116.4074], size: 0.08 },
    { location: [-23.5505, -46.6333], size: 0.1 },
    { location: [19.4326, -99.1332], size: 0.1 },
    { location: [40.7128, -74.006], size: 0.1 },
    { location: [34.6937, 135.5022], size: 0.05 },
    { location: [41.0082, 28.9784], size: 0.06 },
  ],
}

export function Globe({
  className,
  config = GLOBE_CONFIG,
}: {
  className?: string
  config?: COBEOptions
}) {
  const phi = useRef(0)
  const width = useRef(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerInteracting = useRef<number | null>(null)
  const pointerInteractionMovement = useRef(0)
  const rotation = useRef(0)
  const [, setRenderTick] = useState(0)

  const updatePointerInteraction = (value: number | null) => {
    pointerInteracting.current = value
    if (canvasRef.current) {
      canvasRef.current.style.cursor = value === null ? "grab" : "grabbing"
    }
  }

  const updateMovement = (clientX: number) => {
    if (pointerInteracting.current !== null) {
      const delta = clientX - pointerInteracting.current
      pointerInteractionMovement.current = delta
      rotation.current = delta / 200
      setRenderTick((tick) => tick + 1)
    }
  }

  const onRender = useCallback((state: GlobeRenderState) => {
    if (pointerInteracting.current === null) phi.current += 0.005
    state.phi = phi.current + rotation.current
    state.width = width.current * 2
    state.height = width.current * 2
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onResize = () => {
      width.current = canvas.offsetWidth
    }

    window.addEventListener("resize", onResize)
    onResize()

    const globe = createGlobe(canvas, {
      ...config,
      width: width.current * 2,
      height: width.current * 2,
      onRender,
    } as unknown as COBEOptions)

    const fadeIn = window.setTimeout(() => {
      canvas.style.opacity = "1"
    }, 0)

    return () => {
      window.clearTimeout(fadeIn)
      window.removeEventListener("resize", onResize)
      globe.destroy()
    }
  }, [config, onRender])

  return (
    <div className={cn("absolute inset-0 mx-auto aspect-square w-full max-w-[600px]", className)}>
      <canvas
        className="size-full opacity-0 transition-opacity duration-500 [contain:layout_paint_size]"
        ref={canvasRef}
        onPointerDown={(event) =>
          updatePointerInteraction(
            event.clientX - pointerInteractionMovement.current,
          )
        }
        onPointerUp={() => updatePointerInteraction(null)}
        onPointerCancel={() => updatePointerInteraction(null)}
        onPointerLeave={() => updatePointerInteraction(null)}
        onPointerMove={(event) => updateMovement(event.clientX)}
        onTouchMove={(event) => {
          const touch = event.touches[0]
          if (touch) updateMovement(touch.clientX)
        }}
      />
    </div>
  )
}
