import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { useLogStore } from '../stores/log'
import SessionLog from '../components/master/SessionLog.vue'

vi.mock('../api/log', () => ({
  logApi: {
    list: vi.fn().mockResolvedValue([]),
    add: vi.fn(),
  },
}))

import { logApi } from '../api/log'

const mockList = vi.mocked(logApi.list)
const mockAdd = vi.mocked(logApi.add)

const entry = {
  id: 1,
  game_id: 42,
  ts: '2026-01-01T12:00:00Z',
  kind: 'note',
  text: 'Заметка мастера',
  scene_id: null,
}

describe('SessionLog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.resetAllMocks()
    mockList.mockResolvedValue([])
  })

  it('рендерится с заголовком', async () => {
    const wrapper = mount(SessionLog, { props: { gameId: 42 } })
    await flushPromises()
    expect(wrapper.find('.log-title').text()).toBe('Журнал сессии')
  })

  it('показывает empty-state когда нет записей', async () => {
    mockList.mockResolvedValue([])
    const wrapper = mount(SessionLog, { props: { gameId: 42 } })
    await flushPromises()
    expect(wrapper.find('.log-empty').exists()).toBe(true)
    expect(wrapper.text()).toContain('Журнал пуст')
  })

  it('показывает состояние загрузки', () => {
    let resolve!: (v: typeof entry[]) => void
    mockList.mockReturnValue(new Promise((r) => (resolve = r)))
    const wrapper = mount(SessionLog, { props: { gameId: 42 } })
    expect(wrapper.find('.log-empty').text()).toContain('Загружаю')
    resolve([])
  })

  it('показывает записи журнала', async () => {
    mockList.mockResolvedValue([entry])
    const wrapper = mount(SessionLog, { props: { gameId: 42 } })
    await flushPromises()
    expect(wrapper.find('.log-list').exists()).toBe(true)
    expect(wrapper.find('.entry-text').text()).toBe('Заметка мастера')
  })

  it('иконка note — ✎', async () => {
    mockList.mockResolvedValue([{ ...entry, kind: 'note' }])
    const wrapper = mount(SessionLog, { props: { gameId: 42 } })
    await flushPromises()
    expect(wrapper.find('.entry-icon').text()).toBe('✎')
  })

  it('иконка move — →', async () => {
    mockList.mockResolvedValue([{ ...entry, kind: 'move' }])
    const wrapper = mount(SessionLog, { props: { gameId: 42 } })
    await flushPromises()
    expect(wrapper.find('.entry-icon').text()).toBe('→')
  })

  it('иконка show — ◈', async () => {
    mockList.mockResolvedValue([{ ...entry, kind: 'show' }])
    const wrapper = mount(SessionLog, { props: { gameId: 42 } })
    await flushPromises()
    expect(wrapper.find('.entry-icon').text()).toBe('◈')
  })

  it('иконка roll — ⚄', async () => {
    mockList.mockResolvedValue([{ ...entry, kind: 'roll' }])
    const wrapper = mount(SessionLog, { props: { gameId: 42 } })
    await flushPromises()
    expect(wrapper.find('.entry-icon').text()).toBe('⚄')
  })

  it('неизвестный kind → иконка ·', async () => {
    mockList.mockResolvedValue([{ ...entry, kind: 'unknown' }])
    const wrapper = mount(SessionLog, { props: { gameId: 42 } })
    await flushPromises()
    expect(wrapper.find('.entry-icon').text()).toBe('·')
  })

  it('отображает время записи', async () => {
    mockList.mockResolvedValue([entry])
    const wrapper = mount(SessionLog, { props: { gameId: 42 } })
    await flushPromises()
    expect(wrapper.find('.entry-time').text()).toMatch(/^\d{2}:\d{2}$/)
  })

  it('показывает ошибку при сбое загрузки', async () => {
    mockList.mockRejectedValue(new Error('fail'))
    const wrapper = mount(SessionLog, { props: { gameId: 42 } })
    await flushPromises()
    expect(wrapper.find('.log-error').exists()).toBe(true)
    expect(wrapper.text()).toContain('Не удалось загрузить журнал')
  })

  it('кнопка + неактивна при пустом поле', async () => {
    const wrapper = mount(SessionLog, { props: { gameId: 42 } })
    await flushPromises()
    expect(wrapper.find('.btn-add').attributes('disabled')).toBeDefined()
  })

  it('кнопка + активна при вводе текста', async () => {
    const wrapper = mount(SessionLog, { props: { gameId: 42 } })
    await flushPromises()
    await wrapper.find('.note-input').setValue('тест')
    expect(wrapper.find('.btn-add').attributes('disabled')).toBeUndefined()
  })

  it('submitNote добавляет запись и очищает поле', async () => {
    mockAdd.mockResolvedValue({ ...entry, text: 'новая заметка' })
    const wrapper = mount(SessionLog, { props: { gameId: 42 } })
    await flushPromises()

    await wrapper.find('.note-input').setValue('новая заметка')
    await wrapper.find('.btn-add').trigger('click')
    await flushPromises()

    expect(mockAdd).toHaveBeenCalledWith(42, 'новая заметка')
    expect((wrapper.find('.note-input').element as HTMLInputElement).value).toBe('')
  })

  it('Enter в поле вызывает submitNote', async () => {
    mockAdd.mockResolvedValue(entry)
    const wrapper = mount(SessionLog, { props: { gameId: 42 } })
    await flushPromises()

    await wrapper.find('.note-input').setValue('заметка')
    await wrapper.find('.note-input').trigger('keydown.enter')
    await flushPromises()

    expect(mockAdd).toHaveBeenCalledWith(42, 'заметка')
  })

  it('submitNote не срабатывает при пустом поле', async () => {
    const wrapper = mount(SessionLog, { props: { gameId: 42 } })
    await flushPromises()

    await wrapper.find('.note-input').setValue('   ')
    await wrapper.find('.btn-add').trigger('click')
    await flushPromises()

    expect(mockAdd).not.toHaveBeenCalled()
  })

  it('новая запись добавляется в список после submit', async () => {
    const newEntry = { ...entry, id: 2, text: 'Свежая заметка' }
    mockAdd.mockResolvedValue(newEntry)
    const wrapper = mount(SessionLog, { props: { gameId: 42 } })
    await flushPromises()

    await wrapper.find('.note-input').setValue('Свежая заметка')
    await wrapper.find('.btn-add').trigger('click')
    await flushPromises()

    const store = useLogStore()
    expect(store.entries.some((e) => e.text === 'Свежая заметка')).toBe(true)
  })
})
