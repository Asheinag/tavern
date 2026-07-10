import http from './http'

export interface Character {
  id: number
  owner_id: number
  name: string
  avatar: string | null
  bio: string | null
  created_at: string
}

export interface InviteCode {
  id: number
  code: string
  used_by: number | null
  expires_at: string | null
  created_at: string
}

export const charactersApi = {
  list: () => http.get<Character[]>('/characters'),
  create: (data: { name: string; bio?: string | null }) => http.post<Character>('/characters', data),
  patch: (id: number, data: { name?: string; bio?: string | null }) =>
    http.patch<Character>(`/characters/${id}`, data),
  remove: (id: number) => http.delete(`/characters/${id}`),
  uploadAvatar: (id: number, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return http.post<Character>(`/characters/${id}/avatar`, fd)
  },
}

export const invitesApi = {
  list: () => http.get<InviteCode[]>('/invites'),
  create: (data: { expires_at?: string | null }) => http.post<InviteCode>('/invites', data),
}
