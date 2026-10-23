import { Callout } from '@/components/Callout'
import { None, Slot } from './shared'

export function CatchOuts({ items }: { items: string[] }) {
  return (
    <Slot name="catch_outs" title="Catch-outs">
      {items.length === 0 ? (
        <None />
      ) : (
        <Callout severity="warn" title="Check before you run it">
          <ul className="m-0 grid list-none gap-2 p-0">
            {items.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Callout>
      )}
    </Slot>
  )
}
