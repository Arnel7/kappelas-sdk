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
} from '../types.js'

export class MessagesResource {
  constructor(private http: HttpClient, private base: string) {}

  /** Send a text message, with optional buttons. */
  send(params: SendMessageParams): Promise<SendResult> {
    return this.http.post(`${this.base}/sendMessage`, params)
  }

  /** Send a photo (image file or HTTP URL). */
  async sendPhoto(params: SendPhotoParams): Promise<SendMediaResult> {
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
