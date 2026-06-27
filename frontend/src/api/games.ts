import http from './http'

export interface Game {
  id: number
  title: string
  system: string
  cover: string | null
  share_code: string
  created_at: string
}

export interface GameCreate {
  title: string
  system?: string
}

export const gamesApi = {
  list: () => http.get<Game[]>('/games').then((r) => r.data),
  create: (data: GameCreate) => http.post<Game>('/games', data).then((r) => r.data),
  remove: (id: number) => http.delete(`/games/${id}`),
}
