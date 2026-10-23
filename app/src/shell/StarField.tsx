import { useMemo } from 'react'

/** Small seeded generator so the same stars appear on every load. */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makeStars(count = 90, seed = 20261024) {
  const rnd = mulberry32(seed)
  return Array.from({ length: count }, () => ({
    x: Math.round(rnd() * 10000) / 10,
    y: Math.round(rnd() * 10000) / 10,
    r: 0.6 + rnd() * 1.1,
    o: 0.12 + rnd() * 0.18,
  }))
}

/** Static, sparse star field behind the canvas (spec 10.6). Never animated. */
export function StarField() {
  const stars = useMemo(() => makeStars(), [])
  return (
    <svg
      aria-hidden
      data-testid="star-field"
      className="pointer-events-none absolute inset-0 size-full"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid slice"
    >
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="var(--text-muted)" opacity={s.o} />
      ))}
    </svg>
  )
}
