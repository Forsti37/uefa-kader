import { FileSignature } from 'lucide-react'
import type { Player } from '@/types'
import { salzburgContractEndYear } from '@/lib/uefaUtils'
import { cn } from '@/lib/utils'

type SalzburgContractEndProps = {
  player: Player
  className?: string
  /** Kompaktere Darstellung (Listen). */
  compact?: boolean
}

/** Icon + Vertragsende-Jahr (FC Salzburg), oder nichts wenn unbekannt. */
export function SalzburgContractEnd({
  player,
  className,
  compact = false,
}: SalzburgContractEndProps) {
  const year = salzburgContractEndYear(player)
  if (year == null) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-muted-foreground',
        compact ? 'text-xs' : 'text-sm',
        className,
      )}
      title={`Vertragsende FC Salzburg ${year}`}
    >
      <FileSignature
        className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'}
        aria-hidden
      />
      <span className="tabular-nums">{year}</span>
      <span className="sr-only">Vertragsende FC Salzburg {year}</span>
    </span>
  )
}
