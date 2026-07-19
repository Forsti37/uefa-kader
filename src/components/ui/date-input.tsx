import * as React from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * Parst haeufige Datumsformate (DE/ISO) zu YYYY-MM-DD.
 * Akzeptiert u. a. 02.05.2007, 2.5.2007, 02/05/2007, 2007-05-02.
 */
export function parseFlexibleDate(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null

  // ISO: YYYY-MM-DD
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s)
  if (m) return toIso(Number(m[1]), Number(m[2]), Number(m[3]))

  // DE / slash: DD.MM.YYYY oder DD/MM/YYYY
  m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(s)
  if (m) return toIso(Number(m[3]), Number(m[2]), Number(m[1]))

  // Nur Ziffern: DDMMYYYY oder YYYYMMDD
  const digits = s.replace(/\D/g, '')
  if (digits.length === 8) {
    if (Number(digits.slice(0, 4)) >= 1900) {
      return toIso(
        Number(digits.slice(0, 4)),
        Number(digits.slice(4, 6)),
        Number(digits.slice(6, 8)),
      )
    }
    return toIso(
      Number(digits.slice(4, 8)),
      Number(digits.slice(2, 4)),
      Number(digits.slice(0, 2)),
    )
  }

  return null
}

function toIso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  const dt = new Date(Date.UTC(year, month - 1, day))
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null
  }
  return `${year.toString().padStart(4, '0')}-${month
    .toString()
    .padStart(2, '0')}-${day.toString().padStart(2, '0')}`
}

export interface DateInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value: string
  onChange: (iso: string) => void
}

/**
 * Datumsfeld mit type="date", das beim Einfuegen auch DE-Formate
 * (z. B. 02.05.2007) akzeptiert und in ISO umwandelt.
 */
export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ className, value, onChange, onPaste, ...props }, ref) => {
    function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
      onPaste?.(e)
      if (e.defaultPrevented) return

      const text = e.clipboardData.getData('text')
      const iso = parseFlexibleDate(text)
      if (iso) {
        e.preventDefault()
        onChange(iso)
      }
    }

    return (
      <Input
        ref={ref}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={handlePaste}
        className={cn(className)}
        {...props}
      />
    )
  },
)
DateInput.displayName = 'DateInput'
