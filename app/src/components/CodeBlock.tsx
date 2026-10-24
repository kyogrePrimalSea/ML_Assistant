import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { Highlight, type PrismTheme } from 'prism-react-renderer'
import { IconCheck, IconCopy } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

/** Token-driven Prism theme (spec 10.9): colours resolve through CSS variables, so both themes work. */
const keyword = { color: 'var(--code-keyword)' }
const theme: PrismTheme = {
  plain: { color: 'var(--text)', backgroundColor: 'transparent' },
  styles: [
    { types: ['keyword', 'builtin', 'boolean', 'constant', 'operator'], style: keyword },
    { types: ['string', 'char', 'template-string', 'attr-value'], style: { color: 'var(--code-string)' } },
    { types: ['number'], style: { color: 'var(--code-number)' } },
    { types: ['comment', 'prolog', 'doctype'], style: { color: 'var(--code-comment)' } },
  ],
}

export function CodeBlock({
  code,
  language = 'python',
  className,
}: {
  /** Exact snippet, including its own version-stamp first line. */
  code: string
  language?: string
  className?: string
}) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  // Mark lines that wrapped so the gutter marker shows on them. Purely visual, so it never touches the text.
  const pre = useRef<HTMLPreElement>(null)
  useLayoutEffect(() => {
    const el = pre.current
    if (!el) return
    const mark = () => {
      for (const line of el.querySelectorAll<HTMLElement>('[data-code-line]')) {
        const lh = parseFloat(getComputedStyle(line).lineHeight)
        line.toggleAttribute('data-wrapped', Number.isFinite(lh) && line.getBoundingClientRect().height > lh * 1.5)
      }
    }
    mark()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(mark)
    ro.observe(el)
    return () => ro.disconnect()
  }, [code])

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      return
    }
    setCopied(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      data-slot="code-block"
      className={cn('relative rounded-md border border-border bg-code-bg', className)}
    >
      <button
        type="button"
        onClick={copy}
        aria-label="Copy code"
        className="absolute top-2 right-2 inline-flex h-8 items-center gap-1.5 rounded-md border border-border-strong bg-surface-1 px-2.5 text-xs font-bold text-text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {copied ? <IconCheck className="size-4" aria-hidden /> : <IconCopy className="size-4" aria-hidden />}
        {copied ? 'Copied' : 'Copy'}
      </button>
      <span role="status" className="sr-only">
        {copied ? 'Copied' : ''}
      </span>
      <Highlight theme={theme} code={code.replace(/\n$/, '')} language={language}>
        {({ tokens, getLineProps, getTokenProps }) => (
          <pre
            ref={pre}
            tabIndex={0}
            aria-label="Code"
            data-code-wrap
            className="m-0 overflow-x-hidden rounded-md border-0 bg-transparent py-3 pr-4 pl-4 text-[13px] leading-[1.6]"
            style={{ fontVariantLigatures: 'none' }}
          >
            <code className="block min-w-0 border-0 bg-transparent p-0 text-[13px]">
              {tokens.map((line, i) => {
                // Hanging indent: continuation lines sit two characters in from where the code starts.
                const lead = (line.map((t) => t.content).join('').match(/^ */) ?? [''])[0].length
                const props = getLineProps({ line })
                return (
                <div
                  key={i}
                  data-code-line
                  {...props}
                  className={cn(props.className, 'code-line')}
                  style={{
                    ...props.style,
                    '--lead': lead,
                    // The copy button sits over the first line's right end.
                    ...(i === 0 ? { paddingRight: '6rem' } : null),
                  } as CSSProperties}
                >
                  {line.map((token, k) => (
                    <span key={k} {...getTokenProps({ token })} />
                  ))}
                  {'\n'}
                </div>
                )
              })}
            </code>
          </pre>
        )}
      </Highlight>
    </div>
  )
}
