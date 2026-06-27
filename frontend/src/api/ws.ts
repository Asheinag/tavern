type MessageHandler = (data: unknown) => void

export interface WsClientLike {
  connect(): void
  send(type: string, payload?: Record<string, unknown>): void
  disconnect(): void
}

class WsClient implements WsClientLike {
  private ws: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private stopped = false

  constructor(
    private gameId: number,
    private role: 'master' | 'player',
    private onMessage: MessageHandler,
  ) {}

  connect(): void {
    if (this.stopped) return
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${protocol}//${window.location.host}/ws/${this.gameId}?role=${this.role}`
    this.ws = new WebSocket(url)
    this.ws.onmessage = (e) => {
      try {
        this.onMessage(JSON.parse(e.data as string))
      } catch {
        // ignore malformed frames
      }
    }
    this.ws.onclose = () => {
      if (!this.stopped) this.scheduleReconnect()
    }
    this.ws.onerror = () => this.ws?.close()
  }

  send(type: string, payload: Record<string, unknown> = {}): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }))
    }
  }

  disconnect(): void {
    this.stopped = true
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.ws?.close()
    this.ws = null
  }

  private scheduleReconnect(): void {
    this.reconnectTimer = setTimeout(() => this.connect(), 3000)
  }
}

export function createWsClient(
  gameId: number,
  role: 'master' | 'player',
  onMessage: MessageHandler,
): WsClientLike {
  return new WsClient(gameId, role, onMessage)
}
