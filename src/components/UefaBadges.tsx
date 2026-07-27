import { Badge } from '@/components/ui/badge'
import { UEFA_CATEGORY_LABELS, type Player, type UefaCategory } from '@/types'
import { getUefaCategory, isListBEligible } from '@/lib/uefaUtils'
import { cn } from '@/lib/utils'

const SHORT_UEFA_LABELS: Record<UefaCategory, string> = {
  CTP: 'CTP',
  ATP: 'ATP',
  NON_LOCAL: 'Non-Local',
}

export function UefaCategoryBadge({
  player,
  compact = false,
}: {
  player: Player
  compact?: boolean
}) {
  const cat = getUefaCategory(player)
  const variant =
    cat === 'CTP' ? 'success' : cat === 'ATP' ? 'warning' : 'secondary'
  return (
    <Badge
      variant={variant}
      className={cn(compact && 'px-1.5 py-0 text-[10px] leading-4')}
    >
      {compact ? SHORT_UEFA_LABELS[cat] : UEFA_CATEGORY_LABELS[cat]}
    </Badge>
  )
}

/**
 * Zeigt die UEFA-Ausbildungskategorie (CTP/ATP/Non-locally trained) und - falls
 * zutreffend - zusaetzlich die B-Listen-Berechtigung. Ein Spieler kann beides
 * haben (z. B. Non-locally trained UND B-Liste-berechtigt). Die A-Liste wird
 * bewusst nicht angezeigt, da grundsaetzlich jeder Spieler A-Listen-faehig ist.
 */
export function PlayerCategoryBadges({
  player,
  compact = false,
}: {
  player: Player
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        'flex min-w-0',
        compact ? 'flex-col items-start gap-0.5' : 'flex-wrap gap-1',
      )}
    >
      <UefaCategoryBadge player={player} compact={compact} />
      {isListBEligible(player) && (
        <Badge
          variant="default"
          className={cn(compact && 'px-1.5 py-0 text-[10px] leading-4')}
        >
          {compact ? 'B' : 'B-Liste'}
        </Badge>
      )}
    </div>
  )
}
