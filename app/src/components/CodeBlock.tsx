import { useEffect, useRef, useState } from 'react'
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
            tabIndex={0}
            aria-label="Code"
            className="m-0 overflow-x-auto rounded-md border-0 bg-transparent py-3 pr-24 pl-4 text-[13px] leading-[1.6]"
            style={{ fontVariantLigatures: 'none' }}
          >
            <code className="block w-max min-w-full border-0 bg-transparent p-0 text-[13px]">
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                  {line.map((token, k) => (
                    <span key={k} {...getTokenProps({ token })} />
                  ))}
                  {'\n'}
                </div>
              ))}
            </code>
          </pre>
        )}
      </Highlight>
    </div>
  )
}
