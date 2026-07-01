import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createWsClient } from '../api/ws'

// Мок WebSocket для тестов без реального сервера
class MockWs {
  static OPEN = 1
  static lastInstance: MockWs | null = null

  url: string
  readyState = 0
  onmessage: ((e: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null
  send = vi.fn()
  close = vi.fn().mockImplementation(() => {
    this.readyState = 3
    this.onclose?.()
  })

  constructor(url: string) {
    this.url = url
    MockWs.lastInstance = this
  }

  open() {
    this.readyState = MockWs.OPEN
  }
}

beforeEach(() => {
  MockWs.lastInstance = null
  vi.stubGlobal('WebSocket', MockWs)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('createWsClient', () => {
  it('возвращает клиент с методами connect/send/disconnect', () => {
    const client = createWsClient(1, 'master', vi.fn())
    expect(typeof client.connect).toBe('function')
    expect(typeof client.send).toBe('function')
    expect(typeof client.disconnect).toBe('function')
  })
})

describe('WsClient.connect', () => {
  it('создаёт WebSocket с корректным URL', () => {
    const client = createWsClient(42, 'master', vi.fn())
    client.connect()
    expect(MockWs.lastInstance?.url).toContain('/ws/42')
    expect(MockWs.lastInstance?.url).toContain('role=master')
  })

  it('использует ws:// для http-страниц', () => {
    const client = createWsClient(1, 'player', vi.fn())
    client.connect()
    expect(MockWs.lastInstance?.url).toMatch(/^ws:\/\//)
  })

  it('не переподключается если уже отключён (stopped)', () => {
    const client = createWsClient(1, 'master', vi.fn())
    client.disconnect()
    client.connect()
    expect(MockWs.lastInstance).toBeNull()
  })
})

describe('WsClient.send', () => {
  it('отправляет JSON когда WS открыт', () => {
    const client = createWsClient(1, 'master', vi.fn())
    client.connect()
    MockWs.lastInstance!.open()
    client.send('show_bg', { artId: 7 })
    expect(MockWs.lastInstance!.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'show_bg', payload: { artId: 7 } }),
    )
  })

  it('ничего не делает когда WS не открыт', () => {
    const client = createWsClient(1, 'master', vi.fn())
    client.connect()
    // readyState = 0 (CONNECTING), не OPEN
    client.send('show_bg', { artId: 7 })
    expect(MockWs.lastInstance!.send).not.toHaveBeenCalled()
  })
})

describe('WsClient.disconnect', () => {
  it('закрывает WebSocket', () => {
    const client = createWsClient(1, 'master', vi.fn())
    client.connect()
    const ws = MockWs.lastInstance!
    client.disconnect()
    expect(ws.close).toHaveBeenCalled()
  })

  it('останавливает переподключение', () => {
    const client = createWsClient(1, 'master', vi.fn())
    client.connect()
    client.disconnect()
    vi.advanceTimersByTime(5000)
    // после disconnect() новых инстансов быть не должно
    const instanceAfterDisconnect = MockWs.lastInstance
    expect(instanceAfterDisconnect?.url).toContain('/ws/1')
  })
})

describe('WsClient onmessage', () => {
  it('парсит JSON и вызывает обработчик', () => {
    const handler = vi.fn()
    const client = createWsClient(1, 'master', handler)
    client.connect()
    MockWs.lastInstance!.onmessage?.({ data: JSON.stringify({ type: 'snapshot' }) })
    expect(handler).toHaveBeenCalledWith({ type: 'snapshot' })
  })

  it('игнорирует невалидный JSON', () => {
    const handler = vi.fn()
    const client = createWsClient(1, 'master', handler)
    client.connect()
    expect(() => {
      MockWs.lastInstance!.onmessage?.({ data: 'not-json' })
    }).not.toThrow()
    expect(handler).not.toHaveBeenCalled()
  })
})

describe('WsClient переподключение', () => {
  it('перезапускает соединение через 3 секунды после разрыва', () => {
    const client = createWsClient(1, 'master', vi.fn())
    client.connect()
    const firstWs = MockWs.lastInstance!
    firstWs.onclose?.()
    vi.advanceTimersByTime(3000)
    expect(MockWs.lastInstance).not.toBe(firstWs)
  })

  it('НЕ переподключается после disconnect()', () => {
    const client = createWsClient(1, 'master', vi.fn())
    client.connect()
    const firstWs = MockWs.lastInstance!
    client.disconnect()
    vi.advanceTimersByTime(3000)
    expect(MockWs.lastInstance).toBe(firstWs)
  })

  it('onerror закрывает WebSocket', () => {
    const client = createWsClient(1, 'master', vi.fn())
    client.connect()
    const ws = MockWs.lastInstance!
    ws.onerror?.()
    expect(ws.close).toHaveBeenCalled()
  })
})
