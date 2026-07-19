import { Badge } from '@/components/ui/badge'
import { UEFA_CATEGORY_LABELS, type Player } from '@/types'
import { getUefaCategory, isListBEligible } from '@/lib/uefaUtils'

export function UefaCategoryBadge({ player }: { player: Player }) {
  const cat = getUefaCategory(player)
  const variant =
    cat === 'CTP' ? 'success' : cat === 'ATP' ? 'warning' : 'secondary'
  return <Badge variant={variant}>{UEFA_CATEGORY_LABELS[cat]}</Badge>
}

/**
 * Zeigt die UEFA-Ausbildungskategorie (CTP/ATP/Non-locally trained) und - falls
 * zutreffend - zusaetzlich die B-Listen-Berechtigung. Ein Spieler kann beides
 * haben (z. B. Non-locally trained UND B-Liste-berechtigt). Die A-Liste wird
 * bewusst nicht angezeigt, da grundsaetzlich jeder Spieler A-Listen-faehig ist.
 */
export function PlayerCategoryBadges({ player }: { player: Player }) {
  return (
    <div className="flex flex-wrap gap-1">
      <UefaCategoryBadge player={player} />
      {isListBEligible(player) && <Badge variant="default">B-Liste</Badge>}
    </div>
  )
}
