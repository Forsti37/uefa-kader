import { describe, it, expect } from 'vitest'
import { parseFlexibleDate } from '@/components/ui/date-input'

describe('parseFlexibleDate', () => {
  it('akzeptiert ISO', () => {
    expect(parseFlexibleDate('2007-05-02')).toBe('2007-05-02')
  })

  it('akzeptiert deutsches Format mit Punkten', () => {
    expect(parseFlexibleDate('02.05.2007')).toBe('2007-05-02')
    expect(parseFlexibleDate('2.5.2007')).toBe('2007-05-02')
  })

  it('akzeptiert Slash-Format', () => {
    expect(parseFlexibleDate('02/05/2007')).toBe('2007-05-02')
  })

  it('akzeptiert reine Ziffern DDMMYYYY', () => {
    expect(parseFlexibleDate('02052007')).toBe('2007-05-02')
  })

  it('lehnt ungueltige Daten ab', () => {
    expect(parseFlexibleDate('32.13.2007')).toBeNull()
    expect(parseFlexibleDate('abc')).toBeNull()
    expect(parseFlexibleDate('')).toBeNull()
  })
})
