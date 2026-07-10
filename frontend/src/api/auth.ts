import http from './http'

export interface User {
  id: number
  username: string
  avatar: string | null
  bio: string | null
  system_role: string
  created_at: string
}

export interface RegisterPayload {
  username: string
  password: string
  invite_code: string
}

export interface LoginPayload {
  username: string
  password: string
}

export const authApi = {
  me: () => http.get<User>('/auth/me'),
  login: (data: LoginPayload) => http.post<User>('/auth/login', data),
  register: (data: RegisterPayload) => http.post<User>('/auth/register', data),
  logout: () => http.post('/auth/logout'),
  uploadAvatar: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return http.post<User>('/auth/avatar', fd)
  },
}
