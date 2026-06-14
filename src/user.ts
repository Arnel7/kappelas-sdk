import { EventEmitter } from 'events'
import { HttpClient } from './http.js'
import { WSClient } from './ws-client.js'
import { MessagesResource } from './resources/messages.js'
import { ChatsResource }    from './resources/chats.js'
import { WebhooksResource } from './resources/webhooks.js'
import { UserProfileResource } from './resources/profile.js'
import { CommunitiesResource } from './resources/communities.js'
import { StoriesResource } from './resources/stories.js'
import type { Message, CallbackQuery, KappelaWireEvent, SendMessageParams, SendResult } from './types.js'
import { dispatchWireEvent, dispatchWebhookEvent } from './bot.js'
import { toWsUrl } from './util.js'

export interface KappelaUserOptions {
  apiKey:         string
  baseUrl?:       string
  maxRetries?:    number
  timeoutMs?:     number
  wsMaxRetries?:  number
}

// ─── Typed overloads ─────────────────────────────────────────────────────────
export declare interface KappelaUser {
  on(event: 'message',        listener: (msg: Message)                      => void | Promise<void>): this
  on(event: 'callback_query', listener: (cb: CallbackQuery)                 => void | Promise<void>): this
  on(event: 'raw',            listener: (event: KappelaWireEvent)           => void): this
  on(event: 'error',          listener: (err: Error)                        => void): this
  on(event: 'connected',      listener: ()                                  => void): this
  on(event: 'disconnected',   listener: (code: number, reason: string)      => void): this
  once(event: 'message',        listener: (msg: Message)                   => void | Promise<void>): this
  once(event: 'callback_query', listener: (cb: CallbackQuery)              => void | Promise<void>): this
  once(event: 'raw',            listener: (event: KappelaWireEvent)        => void): this
  once(event: 'error',          listener: (err: Error)                     => void): this
  once(event: 'connected',      listener: ()                               => void): this
  once(event: 'disconnected',   listener: (code: number, reason: string)   => void): this
  off(event: 'message',         listener: (msg: Message)                   => void | Promise<void>): this
  off(event: 'callback_query',  listener: (cb: CallbackQuery)              => void | Promise<void>): this
  off(event: 'raw',             listener: (event: KappelaWireEvent)        => void): this
  off(event: 'error',           listener: (err: Error)                     => void): this
  off(event: 'connected',       listener: ()                               => void): this
  off(event: 'disconnected',    listener: (code: number, reason: string)   => void): this
  emit(event: 'message',        msg:     Message):                   boolean
  emit(event: 'callback_query', cb:      CallbackQuery):             boolean
  emit(event: 'raw',            wire:    KappelaWireEvent):          boolean
  emit(event: 'error',          err:     Error):                     boolean
  emit(event: 'connected'):                                           boolean
  emit(event: 'disconnected',   code:    number, reason: string):    boolean
}

/**
 * KappelaUser — Personal automation SDK.
 * Authenticate with a personal API key (`sk_...`) to send messages
 * and receive events as yourself.
 *
 * @example
 * ```ts
 * const me = new KappelaUser({ apiKey: 'sk_...' })
 *
 * me.on('message', (msg) => {
 *   console.log('New message from', msg.sender_name, ':', msg.text)
 * })
 *
 * me.start()
 * ```
 */
export class KappelaUser extends EventEmitter {
  /** Send and manage messages. */
  readonly messages: MessagesResource

  /** Access and iterate over chats. */
  readonly chats: ChatsResource

  /**
   * Manage webhooks.
   *
   * @remarks
   * In development use `start()` (WebSocket).
   * **In production, prefer setting a webhook** — it is more reliable and
   * does not require a persistent connection:
   * ```ts
   * await me.webhooks.set({ url: 'https://your-server.com/kappela-webhook' })
   * ```
   */
  readonly webhooks: WebhooksResource

  /** Read your profile. */
  readonly profile: UserProfileResource

  /** Manage communities (members, roles, invites, requests) as yourself. */
  readonly communities: CommunitiesResource

  /** Create and manage your stories (24 h éphémères). */
  readonly stories: StoriesResource

  private http: HttpClient
  private ws:   WSClient
  private base  = '/v1/me'

  constructor(opts: KappelaUserOptions) {
    super()

    // Guard: EventEmitter throws if 'error' is emitted with no listener.
    // We attach a default that can be overridden.
    super.on('error', () => undefined)

    const baseUrl = opts.baseUrl ?? 'https://api.kappelas.com'

    this.http = new HttpClient({ baseUrl, maxRetries: opts.maxRetries, timeoutMs: opts.timeoutMs })
    this.http.setAuth({ 'X-Api-Key': opts.apiKey })

    const wsPath = `${this.base}/ws?api_key=${opts.apiKey}`
    this.ws = new WSClient(toWsUrl(baseUrl, wsPath), opts.wsMaxRetries)

    this.messages    = new MessagesResource(this.http, this.base)
    this.chats       = new ChatsResource(this.http, this.base)
    this.webhooks    = new WebhooksResource(this.http, this.base)
    this.profile     = new UserProfileResource(this.http, this.base)
    this.communities = new CommunitiesResource(this.http, this.base)
    this.stories     = new StoriesResource(this.http, this.base)

    // Forward WS events to this emitter
    this.ws.on('raw',          (e)              => dispatchWireEvent(this, e))
    this.ws.on('connected',    ()               => this.emit('connected'))
    this.ws.on('disconnected', (code, reason)   => this.emit('disconnected', code, reason))
    this.ws.on('error',        (err)            => this.emit('error', err))
  }

  /**
   * Connect via WebSocket and start receiving events.
   *
   * @remarks
   * Use this **only in development / local scripts**.
   * In production, configure a webhook instead:
   * ```ts
   * await me.webhooks.set({ url: 'https://your-server.com/webhook' })
   * ```
   */
  start(): this {
    this.ws.connect()
    return this
  }

  /** Close the WebSocket connection. */
  stop(): this {
    this.ws.disconnect()
    return this
  }

  /**
   * Convenience shorthand — send a text reply to a `message` or `callback_query` event
   * without repeating `chat_id` and `reply_to_id` manually.
   *
   * - With a **`Message`** — sets `reply_to_id` automatically (shows a quote banner).
   * - With a **`CallbackQuery`** — sends to the same chat, no quote banner
   *   (callback queries have no message ID to quote).
   *
   * @example
   * ```ts
   * me.on('message', async (msg) => {
   *   await me.reply(msg, 'Got it! 👋')
   * })
   * ```
   */
  reply(
    ctx:     Message | CallbackQuery,
    text:    string,
    params?: Omit<SendMessageParams, 'chat_id' | 'user_id' | 'text' | 'reply_to_id'>,
  ): Promise<SendResult> {
    return this.messages.send({
      chat_id:     ctx.chat_id,
      text,
      reply_to_id: 'id' in ctx ? ctx.id : undefined,
      ...params,
    })
  }

  /** `true` if the WebSocket is currently open. */
  get connected(): boolean {
    return this.ws.isConnected()
  }

  /**
   * Process a webhook payload sent by Kappela to your server.
   * Call this inside your HTTP route handler and respond 200 immediately.
   *
   * @example
   * ```ts
   * app.post('/kappela-webhook', express.json(), (req, res) => {
   *   me.handleWebhook(req.body)
   *   res.sendStatus(200)
   * })
   * ```
   */
  handleWebhook(body: unknown): void {
    // Les webhooks Kappela utilisent le format plat (comme pour les bots),
    // distinct du format enveloppé { type, data } du WebSocket.
    dispatchWebhookEvent(this, body)
  }

  /**
   * Pause this account's personal automations.
   *
   * While paused, the account stops receiving incoming messages over `/v1/me`
   * (so an AI auto-responder is never triggered) and any send call is rejected
   * with `AUTOMATIONS_PAUSED`. Useful when the human owner takes over the chat.
   *
   * @example
   * await me.pauseAutomations()  // the AI stops replying until resumed
   */
  pauseAutomations(): Promise<{ automations_paused: boolean }> {
    return this.http.post(`${this.base}/pauseAutomations`, {})
  }

  /** Resume this account's personal automations after {@link pauseAutomations}. */
  resumeAutomations(): Promise<{ automations_paused: boolean }> {
    return this.http.post(`${this.base}/resumeAutomations`, {})
  }

  /** Get whether this account's personal automations are currently paused. */
  getAutomationStatus(): Promise<{ automations_paused: boolean }> {
    return this.http.post(`${this.base}/getAutomationStatus`, {})
  }

  /**
   * Pause your personal automations in ONE conversation only.
   *
   * Use this to take over a single chat (e.g. you start replying to X yourself):
   * your AI stops receiving messages from that conversation, while it keeps
   * handling all your other chats. Unlike {@link pauseAutomations}, this is scoped
   * to a single conversation.
   *
   * @example
   * await me.pauseAutomationInChat(chatId)  // AI goes silent in this chat only
   */
  pauseAutomationInChat(chatId: number): Promise<{ done: boolean }> {
    return this.http.post(`${this.base}/pauseAutomationInChat`, { chat_id: chatId })
  }

  /** Resume your personal automations in a conversation after {@link pauseAutomationInChat}. */
  resumeAutomationInChat(chatId: number): Promise<{ done: boolean }> {
    return this.http.post(`${this.base}/resumeAutomationInChat`, { chat_id: chatId })
  }
}
