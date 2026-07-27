import { pitchExportHeight } from '@/components/PitchSvg'

/** Gleiche Maße wie Aufstellungs-Export (FormationBoard). */
export const FORMATION_PITCH_W = 720
export const FORMATION_SLOT_W = 148

export function formationPitchHeight(
  pitchWidth: number = FORMATION_PITCH_W,
): number {
  return pitchExportHeight(pitchWidth)
}

export const LINEUP_PITCH_SLOT_THEME = {
  text: '#dddddd',
  textMuted: '#999999',
  border: '#333333',
  box: '#212121',
} as const
