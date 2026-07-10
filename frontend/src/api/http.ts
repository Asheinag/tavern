import axios from 'axios'
import router from '../router'

const http = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401 && !err.config.url?.includes('/auth/')) {
      router.push('/login')
    }
    return Promise.reject(err)
  },
)

export default http
