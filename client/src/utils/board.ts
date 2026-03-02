export interface GridPos {
  row: number
  col: number
}

export function getGridPos(i: number): GridPos {
  if (i <= 10) return { row: 11, col: 11 - i }
  if (i <= 20) return { row: 11 - (i - 10), col: 1 }
  if (i <= 30) return { row: 1, col: 1 + (i - 20) }
  return { row: 1 + (i - 30), col: 11 }
}
