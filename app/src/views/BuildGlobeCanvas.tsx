import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ComponentType } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import Globe, { type GlobeInstance } from 'globe.gl'
import { IconCheck, IconPlaneDeparture, IconQuestionMark, IconX } from '@tabler/icons-react'
import { STAGES } from '@/components/StageBadge'
import type { StageId } from '@/content/types'
import { PASSPORT_POSITION, REGION_CENTRES, regionRing, type Journey, type LatLng } from '@/build/journey'
import { useTheme } from '@/lib/theme'
import { STATUS_WORD } from './buildModel'

/** Build's own copy of the globe (JourneyGlobe stays as the demoed Journey view uses it). Same handle shape. */
export interface GlobeHandle {
  /** Fly (or jump, when `ms` is 0) to a point. */
  flyTo: (p: LatLng, altitude: number, ms: number) => void
  overview: (ms: number) => void
}

interface Props {
  journey: Journey
  selectedN: number | null
  onSelect: (n: number) => void
  /** Optional stages the user chose to skip. Other stages with no pick read "Not picked yet". */
  skipped: ReadonlySet<StageId>
}

const OVERVIEW = { lat: 6, lng: -4, altitude: 1.5 }
/** Fraction of the nominal arc height reached at the midpoint of the curve. */
const ARC_APEX = 0.75
const ZOOMED_ALTITUDE = 1.2

/** Same words and icons as the cards and capsules: Compatible (tick), Not recommended (?), Incompatible (cross). */
const STATUS_ICON = { valid: IconCheck, tip: IconCheck, warn: IconQuestionMark, block: IconX } as const
/** Below this host height the labels of stages without a pick shrink to three letters. */
const COMPACT_HEIGHT = 430

const icon = (C: ComponentType<{ className?: string }>) => renderToStaticMarkup(<C />)
const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Resolve a design token to its current value. */
function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#888'
}

/**
 * The globe: a calm night-sky sphere with a graticule, region outlines per stage, legs coloured by
 * validity, and markers drawn as DOM elements. Stage regions are outlines, never fills (spec 10.3).
 * Nothing loops or spins; camera moves are single flights, and jumps under reduced motion.
 */
export const BuildGlobeCanvas = forwardRef<GlobeHandle, Props>(function BuildGlobeCanvas(
  { journey, selectedN, onSelect, skipped },
  ref,
) {
  const host = useRef<HTMLDivElement>(null)
  const globe = useRef<GlobeInstance | null>(null)
  const [failed, setFailed] = useState(false)
  const { resolved } = useTheme()
  const onSelectRef = useRef(onSelect)
  useEffect(() => {
    onSelectRef.current = onSelect
  })

  useImperativeHandle(ref, () => ({
    flyTo: (p, altitude, ms) => globe.current?.pointOfView({ lat: p.lat, lng: p.lng, altitude }, ms),
    overview: (ms) => globe.current?.pointOfView(OVERVIEW, ms),
  }))

  // Create the globe once.
  useEffect(() => {
    const el = host.current
    if (!el) return
    let g: GlobeInstance
    try {
      g = new Globe(el, { rendererConfig: { antialias: true, alpha: true } })
    } catch {
      // No WebGL (old browser, locked-down machine): the itinerary list carries the same route.
      setFailed(true)
      return
    }
    globe.current = g
    g.backgroundColor('rgba(0,0,0,0)')
      .showGraticules(true)
      .showAtmosphere(true)
      .atmosphereAltitude(0.12)
      .arcsTransitionDuration(0)
      .pathTransitionDuration(0)
      .htmlTransitionDuration(0)
      .pointOfView(OVERVIEW, 0)
    const controls = g.controls()
    controls.enablePan = false
    controls.minDistance = 130
    controls.maxDistance = 520
    controls.autoRotate = false
    g.onZoom((pov) => el.setAttribute('data-zoomed', String(pov.altitude < ZOOMED_ALTITUDE)))

    const fit = () => {
      g.width(el.clientWidth).height(el.clientHeight)
      el.setAttribute('data-compact', String(el.clientHeight < COMPACT_HEIGHT))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => {
      ro.disconnect()
      g._destructor()
      el.replaceChildren()
      globe.current = null
    }
  }, [])

  // Re-draw layers when the journey, the selection or the theme changes.
  useEffect(() => {
    const g = globe.current
    if (!g) return
    const css = {
      // A cool, quiet sphere in both themes; the sky (canvas) stays the darkest or lightest thing.
      sphere: resolved === 'dark' ? token('--surface-2') : '#c3cbe8',
      accent: token('--accent'),
      muted: token('--text-muted'),
      border: token('--border-strong'),
      status: { valid: token('--valid-text'), warn: token('--warn-text'), block: token('--block-text'), start: token('--text-muted') },
    }
    const mat = g.globeMaterial() as unknown as { color: { set: (c: string) => void }; emissive: { set: (c: string) => void }; emissiveIntensity: number; shininess: number }
    mat.color.set(css.sphere)
    mat.emissive.set(css.sphere)
    mat.emissiveIntensity = resolved === 'dark' ? 0.55 : 0.25
    mat.shininess = 2
    g.atmosphereColor(css.accent)

    // Region outlines: stage colour, dashed when the stage has no pick (a fly-over).
    const regions = journey.stages.map((s) => ({
      stage: s.stage,
      skipped: s.status === 'skipped',
      points: regionRing(s.stage),
      color: token(`--stage-${s.stage}`),
    }))
    g.pathsData(regions)
      .pathPoints('points')
      .pathPointLat((p) => (p as [number, number])[0])
      .pathPointLng((p) => (p as [number, number])[1])
      .pathPointAlt(0.004)
      .pathColor((d: object) => (d as (typeof regions)[number]).color)
      .pathStroke((d) => ((d as (typeof regions)[number]).skipped ? 0.35 : 0.7))
      .pathDashLength((d) => ((d as (typeof regions)[number]).skipped ? 0.012 : 1))
      .pathDashGap((d) => ((d as (typeof regions)[number]).skipped ? 0.02 : 0))
      .pathDashAnimateTime(0)

    // Legs: colour by validity and a dash pattern as a second cue (solid, dashed, dotted).
    const legs = journey.legs
    const dash = { start: [0.25, 0.3], valid: [1, 0], warn: [0.4, 0.2], block: [0.08, 0.12] } as const
    g.arcsData(legs)
      .arcStartLat((d) => (d as (typeof legs)[number]).from.lat)
      .arcStartLng((d) => (d as (typeof legs)[number]).from.lng)
      .arcEndLat((d) => (d as (typeof legs)[number]).to.lat)
      .arcEndLng((d) => (d as (typeof legs)[number]).to.lng)
      .arcColor((d: object) => css.status[(d as (typeof legs)[number]).status])
      .arcStroke(0.55)
      .arcAltitude((d) => ((d as (typeof legs)[number]).withinStage ? 0.025 : null))
      .arcAltitudeAutoScale(0.4)
      .arcDashLength((d) => dash[(d as (typeof legs)[number]).status][0])
      .arcDashGap((d) => dash[(d as (typeof legs)[number]).status][1])
      .arcDashAnimateTime(0)

    // DOM markers: region labels, the passport, stops and a status badge on each leg.
    const mk = (cls: string, html: string, tag = 'div') => {
      const e = document.createElement(tag)
      e.className = cls
      e.innerHTML = html
      return e
    }
    type Marker = { lat: number; lng: number; alt: number; el: HTMLElement }
    const markers: Marker[] = []

    for (const s of journey.stages) {
      const { label, Icon } = STAGES[s.stage as StageId]
      const c = REGION_CENTRES[s.stage]
      const state = s.status !== 'skipped' ? 'picked' : skipped.has(s.stage as StageId) ? 'skipped' : 'unpicked'
      const note = state === 'picked' ? 'has a pick' : state === 'skipped' ? 'Skipped' : 'Not picked yet'
      const e = mk('jg-region', `${icon(Icon)}<span class="jg-region-full">${label}</span><span class="jg-region-abbr" aria-hidden="true">${label.slice(0, 3)}</span>`)
      e.dataset.state = state
      e.tabIndex = 0
      e.title = `${label}: ${note}`
      e.setAttribute('aria-label', `${label}: ${note}`)
      e.style.setProperty('--jg-stage', `var(--stage-${s.stage})`)
      markers.push({ lat: c.lat - 8.4, lng: c.lng, alt: 0.01, el: e })
    }
    markers.push({
      lat: PASSPORT_POSITION.lat + 9, lng: PASSPORT_POSITION.lng, alt: 0.01,
      el: mk('jg-passport', `${icon(IconPlaneDeparture)}<span>Start</span>`),
    })
    for (const leg of legs) {
      if (leg.status === 'start') continue
      const label = STATUS_WORD[leg.status]
      const e = mk('jg-leg', icon(STATUS_ICON[leg.status]))
      e.dataset.status = leg.status
      e.title = `Leg ${leg.fromN} to ${leg.toN}: ${label}`
      // Sit the badge on the arc's apex: arcs rise in proportion to their length (arcAltitudeAutoScale).
      const dist = Math.hypot(leg.to.lat - leg.from.lat, leg.to.lng - leg.from.lng) * (Math.PI / 180)
      const apex = leg.withinStage ? 0.025 : 0.4 * dist * ARC_APEX
      markers.push({ lat: (leg.from.lat + leg.to.lat) / 2, lng: (leg.from.lng + leg.to.lng) / 2, alt: apex, el: e })
    }
    for (const stop of journey.stops) {
      const label = STATUS_WORD[stop.status]
      const Icon = STATUS_ICON[stop.status]
      const stage = STAGES[stop.record.stage]
      const b = mk(
        'jg-stop',
        `<span class="jg-stop-n">${stop.n}</span>${icon(Icon)}<span class="jg-stop-label">${esc(stop.record.plain_name)}</span>`,
        'button',
      )
      b.setAttribute('type', 'button')
      b.setAttribute('aria-label', `Stop ${stop.n}, ${stop.record.plain_name}, ${stage.label}, ${label}`)
      b.dataset.status = stop.status
      b.dataset.selected = String(stop.n === selectedN)
      b.style.setProperty('--jg-stage', `var(--stage-${stop.record.stage})`)
      b.addEventListener('click', () => onSelectRef.current(stop.n))
      markers.push({ ...stop.position, alt: 0.05, el: b })
    }
    g.htmlElementsData(markers)
      .htmlLat('lat')
      .htmlLng('lng')
      .htmlAltitude('alt')
      .htmlElement((d) => (d as Marker).el)
  }, [journey, selectedN, resolved, skipped])

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        ref={host}
        role="img"
        aria-label="Globe showing the pipeline route. The journey panel beside it has the same information."
        data-testid="build-globe"
        data-zoomed="false"
        className="jg-host h-full w-full"
        hidden={failed}
      />
      {failed ? (
        <p className="absolute inset-0 grid place-items-center p-8 text-center text-text-muted">
          The globe needs WebGL, which is not available here. The journey panel shows the same route.
        </p>
      ) : null}
    </div>
  )
})
