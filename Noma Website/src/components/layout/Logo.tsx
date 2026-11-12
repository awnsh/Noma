import nomaMark from '../../assets/noma-mark.png'
import nomaWordmark from '../../assets/noma-wordmark.png'

/**
 * The N mark plus the Noma wordmark, both brand PNGs used as CSS masks so
 * they draw in currentColor and work on paper and on ink. The wordmark is
 * about 7:1, so its width follows from the height.
 */
export default function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label="Noma" role="img">
      <span aria-hidden className="noma-mark inline-block h-[18px] w-[28px]" style={{ ['--mark' as string]: `url(${nomaMark})` }} />
      <span
        aria-hidden
        className="noma-mark inline-block h-[14px] w-[99px]"
        style={{ ['--mark' as string]: `url(${nomaWordmark})` }}
      />
    </span>
  )
}
