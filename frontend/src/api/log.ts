import http from './http'

export interface LogEntry {
  id: number
  game_id: number
  ts: string
  kind: string
  text: string
  scene_id: number | null
}

export const logApi = {
  list: (gameId: number) =>
    http.get<LogEntry[]>(`/games/${gameId}/log`).then((r) => r.data),
  add: (gameId: number, text: string) =>
    http.post<LogEntry>(`/games/${gameId}/log`, { text }).then((r) => r.data),
}
