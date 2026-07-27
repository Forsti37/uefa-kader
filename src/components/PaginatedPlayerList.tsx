import { useEffect, useState, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

const DEFAULT_INITIAL = 5
const DEFAULT_STEP = 5

export function PaginatedPlayerList<T>({
  items,
  getKey,
  renderItem,
  initialCount = DEFAULT_INITIAL,
  step = DEFAULT_STEP,
  emptyMessage,
}: {
  items: T[]
  getKey: (item: T) => string
  renderItem: (item: T) => ReactNode
  initialCount?: number
  step?: number
  emptyMessage?: ReactNode
}) {
  const [visibleCount, setVisibleCount] = useState(initialCount)

  useEffect(() => {
    setVisibleCount((prev) =>
      items.length < prev ? Math.min(initialCount, items.length) : prev,
    )
  }, [items.length, initialCount])

  if (items.length === 0) {
    return emptyMessage ? <>{emptyMessage}</> : null
  }

  const shown = items.slice(0, visibleCount)
  const hasMore = visibleCount < items.length
  const hiddenCount = items.length - visibleCount

  return (
    <div className="space-y-2">
      {shown.map((item) => (
        <div key={getKey(item)}>{renderItem(item)}</div>
      ))}
      {hasMore && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setVisibleCount((n) => Math.min(n + step, items.length))}
        >
          <ChevronDown className="h-4 w-4" />
          {Math.min(step, hiddenCount)} weitere anzeigen
          <span className="text-muted-foreground">
            ({hiddenCount} ausgeblendet)
          </span>
        </Button>
      )}
    </div>
  )
}
