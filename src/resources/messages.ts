import type { HttpClient } from '../http.js'
import { buildMediaForm, resolveFileInput } from '../http.js'
import { KappelaError } from '../errors.js'
import type {
  SendMessageParams,
  SendPhotoParams,
  SendVideoParams,
  SendDocumentParams,
  SendAudioParams,
  SendCarouselParams,
  SendTypingParams,
  DeleteMessageParams,
  EditMessageParams,
  SendResult,
  SendMediaResult,
  SendCarouselResult,
  GetFileResult,
  TypingResult,
  DeleteResult,
  EditMessageResult,
  CloseWebviewParams,
  CloseWebviewResult,
} from '../types.js'

export class MessagesResource {
  constructor(private http: HttpClient, private base: string) {}

  /** Send a text message, with optional buttons. */
  send(params: SendMessageParams): Promise<SendResult> {
    return this.http.post(`${this.base}/sendMessage`, params)
  }

  /**
   * Remotely close the in-app WebView opened by an `open_webview` action button on the
   * recipient's device(s). Use it when the outcome is confirmed server-side (e.g. a payment
   * webhook) instead of relying on the web page calling `Kappelas.close()`. The event reaches
   * **all** of the recipient's connected devices (personal real-time channel).
   *
   * @example
   * // After your payment provider confirms the charge:
   * await bot.messages.closeWebview({ chat_id: 42 })
   */
  closeWebview(params: CloseWebviewParams): Promise<CloseWebviewResult> {
    return this.http.post(`${this.base}/closeWebview`, params)
  }

  /**
   * Fire-and-forget typing ping, shown while a media upload is in flight so the
   * recipient sees activity during a potentially slow send (photo, video, voice…).
   * Errors are swallowed — a failed ping must never break the actual send.
   */
  private pingTyping(target: { chat_id?: number; user_id?: string }, action?: string): void {
    const t: SendTypingParams | null =
      target.chat_id != null ? { chat_id: target.chat_id, is_typing: true, action }
      : target.user_id != null ? { user_id: target.user_id, is_typing: true, action }
      : null
    if (t) void this.sendTyping(t).catch(() => {})
  }

  /** Send a photo (image file or HTTP URL). Emits a typing indicator during upload. */
  async sendPhoto(params: SendPhotoParams): Promise<SendMediaResult> {
    this.pingTyping(params, 'sending_photo')
    const file = await resolveFileInput(params.photo, 'photo.jpg')
    return this.http.postForm(`${this.base}/sendPhoto`, () =>
      buildMediaForm('photo', params, file, {
        caption:         params.caption,
        reply_to_id:     params.reply_to_id,
        delete_previous: params.delete_previous,
        reply_markup:    params.reply_markup,
      }),
    )
  }

  /** Send a video file or HTTP URL. */
  async sendVideo(params: SendVideoParams): Promise<SendMediaResult> {
    this.pingTyping(params, 'sending_video')
    const file = await resolveFileInput(params.video, 'video.mp4')
    return this.http.postForm(`${this.base}/sendVideo`, () =>
      buildMediaForm('video', params, file, {
        caption:         params.caption,
        reply_to_id:     params.reply_to_id,
        delete_previous: params.delete_previous,
        reply_markup:    params.reply_markup,
      }),
    )
  }

  /** Send a document / file or HTTP URL. */
  async sendDocument(params: SendDocumentParams): Promise<SendMediaResult> {
    this.pingTyping(params, 'sending_document')
    const file = await resolveFileInput(params.document, 'document')
    return this.http.postForm(`${this.base}/sendDocument`, () =>
      buildMediaForm('document', params, file, {
        caption:         params.caption,
        reply_to_id:     params.reply_to_id,
        delete_previous: params.delete_previous,
        reply_markup:    params.reply_markup,
      }),
    )
  }

  /** Send an audio file or HTTP URL. */
  async sendAudio(params: SendAudioParams): Promise<SendMediaResult> {
    this.pingTyping(params, 'recording_audio')
    const file = await resolveFileInput(params.audio, 'audio.mp3')
    return this.http.postForm(`${this.base}/sendAudio`, () =>
      buildMediaForm('audio', params, file, {
        caption:         params.caption,
        reply_to_id:     params.reply_to_id,
        delete_previous: params.delete_previous,
        reply_markup:    params.reply_markup,
      }),
    )
  }

  /** Send a product/card carousel. */
  sendCarousel(params: SendCarouselParams): Promise<SendCarouselResult> {
    return this.http.post(`${this.base}/sendCarousel`, params)
  }

  /** Show or hide the typing indicator in a chat. */
  sendTyping(params: SendTypingParams): Promise<TypingResult> {
    return this.http.post(`${this.base}/sendTyping`, {
      ...params,
      is_typing: params.is_typing ?? true,
    })
  }

  /** Edit the text or inline keyboard of a message sent by this bot/user. */
  edit(params: EditMessageParams): Promise<EditMessageResult> {
    return this.http.post(`${this.base}/editMessage`, params)
  }

  /** Delete a message sent by this bot/user. */
  delete(params: DeleteMessageParams): Promise<DeleteResult> {
    return this.http.post(`${this.base}/deleteMessage`, params)
  }

  /** Resolve a media_id to a short-lived signed download URL and file metadata. */
  getFile(mediaId: string): Promise<GetFileResult> {
    return this.http.get(`${this.base}/getFile?media_id=${mediaId}`)
  }

  /** Download the raw bytes of a media file by its media_id (e.g. a received voice note). */
  async downloadFile(mediaId: string): Promise<Uint8Array> {
    const file = await this.getFile(mediaId)
    if (!file.url) {
      throw new KappelaError('getFile did not return a download URL', 'UPSTREAM_ERROR', 502)
    }
    const res = await fetch(file.url)
    if (!res.ok) {
      throw new KappelaError(`Failed to download media (HTTP ${res.status})`, 'UPSTREAM_ERROR', res.status)
    }
    return new Uint8Array(await res.arrayBuffer())
  }
}
