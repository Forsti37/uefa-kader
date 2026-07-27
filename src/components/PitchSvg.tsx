import type { CSSProperties } from 'react'

/** FIFA-Näherung: viewBox-Breite 68, Höhe 105 (Tor unten, y nach unten). */
export const PITCH_VIEW_W = 68
export const PITCH_VIEW_H = 105

/** Anzeige: etwas kürzer als volle Länge (weniger Leerraum oben/unten). */
export const PITCH_DISPLAY_ASPECT = '68 / 82'

const LINE = 'rgba(255,255,255,0.9)'
const LINE_W = 0.32

const PA_DEPTH = 16.5
const PA_WIDTH = 40.32
const GA_DEPTH = 5.5
const GA_WIDTH = 18.32
const CENTER_R = 9.15
const PENALTY_SPOT = 11
const CORNER_R = 1
const ARC_R = 9.15

const CX = PITCH_VIEW_W / 2
const H = PITCH_VIEW_H

function paX() {
  return (PITCH_VIEW_W - PA_WIDTH) / 2
}

function gaX() {
  return (PITCH_VIEW_W - GA_WIDTH) / 2
}

function penaltyArcHalfChord() {
  const dy = PA_DEPTH - PENALTY_SPOT
  return Math.sqrt(Math.max(0, ARC_R * ARC_R - dy * dy))
}

type PitchSvgProps = {
  className?: string
  style?: CSSProperties
  patternId?: string
  preserveAspectRatio?: string
}

export function PitchSvg({
  className,
  style,
  patternId = 'grassStripes',
  preserveAspectRatio = 'xMidYMid slice',
}: PitchSvgProps) {
  const midY = H / 2
  const paX0 = paX()
  const gaX0 = gaX()
  const arcHalf = penaltyArcHalfChord()
  const paTopY = H - PA_DEPTH
  const paBottomY = PA_DEPTH

  return (
    <svg
      className={className}
      style={style}
      viewBox={`0 0 ${PITCH_VIEW_W} ${PITCH_VIEW_H}`}
      preserveAspectRatio={preserveAspectRatio}
      aria-hidden
    >
      <defs>
        <pattern
          id={patternId}
          patternUnits="userSpaceOnUse"
          width={PITCH_VIEW_W}
          height={12}
        >
          <rect width={PITCH_VIEW_W} height={6} fill="hsl(128, 42%, 30%)" />
          <rect
            y={6}
            width={PITCH_VIEW_W}
            height={6}
            fill="hsl(128, 44%, 34%)"
          />
        </pattern>
      </defs>
      <rect
        width={PITCH_VIEW_W}
        height={PITCH_VIEW_H}
        fill={`url(#${patternId})`}
      />

      <rect
        x={LINE_W / 2}
        y={LINE_W / 2}
        width={PITCH_VIEW_W - LINE_W}
        height={PITCH_VIEW_H - LINE_W}
        fill="none"
        stroke={LINE}
        strokeWidth={LINE_W}
      />

      <line
        x1={0}
        y1={midY}
        x2={PITCH_VIEW_W}
        y2={midY}
        stroke={LINE}
        strokeWidth={LINE_W}
      />

      <circle
        cx={CX}
        cy={midY}
        r={CENTER_R}
        fill="none"
        stroke={LINE}
        strokeWidth={LINE_W}
      />
      <circle cx={CX} cy={midY} r={0.4} fill={LINE} />

      <rect
        x={paX0}
        y={paTopY}
        width={PA_WIDTH}
        height={PA_DEPTH}
        fill="none"
        stroke={LINE}
        strokeWidth={LINE_W}
      />
      <rect
        x={gaX0}
        y={H - GA_DEPTH}
        width={GA_WIDTH}
        height={GA_DEPTH}
        fill="none"
        stroke={LINE}
        strokeWidth={LINE_W}
      />
      <circle cx={CX} cy={H - PENALTY_SPOT} r={0.35} fill={LINE} />
      <path
        d={`M ${CX - arcHalf} ${paTopY} A ${ARC_R} ${ARC_R} 0 0 1 ${CX + arcHalf} ${paTopY}`}
        fill="none"
        stroke={LINE}
        strokeWidth={LINE_W}
      />

      <rect
        x={paX0}
        y={0}
        width={PA_WIDTH}
        height={PA_DEPTH}
        fill="none"
        stroke={LINE}
        strokeWidth={LINE_W}
      />
      <rect
        x={gaX0}
        y={0}
        width={GA_WIDTH}
        height={GA_DEPTH}
        fill="none"
        stroke={LINE}
        strokeWidth={LINE_W}
      />
      <circle cx={CX} cy={PENALTY_SPOT} r={0.35} fill={LINE} />
      <path
        d={`M ${CX - arcHalf} ${paBottomY} A ${ARC_R} ${ARC_R} 0 0 0 ${CX + arcHalf} ${paBottomY}`}
        fill="none"
        stroke={LINE}
        strokeWidth={LINE_W}
      />

      <path
        d={`M 0 ${H - CORNER_R} A ${CORNER_R} ${CORNER_R} 0 0 0 ${CORNER_R} ${H}`}
        fill="none"
        stroke={LINE}
        strokeWidth={LINE_W}
      />
      <path
        d={`M ${PITCH_VIEW_W - CORNER_R} ${H} A ${CORNER_R} ${CORNER_R} 0 0 0 ${PITCH_VIEW_W} ${H - CORNER_R}`}
        fill="none"
        stroke={LINE}
        strokeWidth={LINE_W}
      />
      <path
        d={`M 0 ${CORNER_R} A ${CORNER_R} ${CORNER_R} 0 0 1 ${CORNER_R} 0`}
        fill="none"
        stroke={LINE}
        strokeWidth={LINE_W}
      />
      <path
        d={`M ${PITCH_VIEW_W - CORNER_R} 0 A ${CORNER_R} ${CORNER_R} 0 0 1 ${PITCH_VIEW_W} ${CORNER_R}`}
        fill="none"
        stroke={LINE}
        strokeWidth={LINE_W}
      />
    </svg>
  )
}

export function pitchExportHeight(pitchWidth: number) {
  return Math.round((pitchWidth * 82) / 68)
}
