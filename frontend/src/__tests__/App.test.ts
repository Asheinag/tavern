import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import axios from 'axios'
import App from '../App.vue'

vi.mock('axios')
const mockedAxios = vi.mocked(axios, true)

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('показывает статус ok после успешного health-запроса', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { backend: 'ok', db: 'ok' } })

    const wrapper = mount(App, { global: { plugins: [createPinia()] } })
    await vi.waitUntil(() => !wrapper.find('.loading').exists())

    expect(wrapper.find('.ok').text()).toContain('ok')
  })

  it('показывает ошибку при недоступном бэкенде', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('Network Error'))

    const wrapper = mount(App, { global: { plugins: [createPinia()] } })
    await vi.waitUntil(() => !wrapper.find('.loading').exists())

    expect(wrapper.find('.error').exists()).toBe(true)
  })
})
