import type { HttpClient } from '../http.js'
import { resolveFileInput, fileInputToBlob } from '../http.js'
import type {
  Story,
  StoryView,
  StoryMediaUpload,
  StoryPreferences,
  CreateStoryParams,
  FileInput,
} from '../types.js'

/**
 * Manage your **stories** (éphémères 24 h) as a user.
 *
 * Stories are a user-only feature — their audience is based on your private
 * conversation contacts. For image/video stories, the SDK uploads the file
 * automatically (like `messages.sendPhoto`), then creates the story.
 *
 * @example
 * // Image story — the SDK uploads the file, then creates the story
 * await me.stories.create({ type: 'image', media: 'https://…/photo.jpg', caption: 'Hello' })
 *
 * // Text story — no upload
 * await me.stories.create({ type: 'text', caption: 'Good morning ☀️' })
 *
 * // Restrict the audience
 * await me.stories.create({ type: 'text', caption: 'Privé', audience: 'selected', audience_user_ids: ['uuid'] })
 */
export class StoriesResource {
  constructor(private http: HttpClient, private base: string) {}

  /**
   * Create a story. For `image`/`video`, pass `media` (file/URL) — it is
   * uploaded automatically — or a pre-uploaded `media_id`. For `text`/`poll`,
   * just pass a `caption`.
   */
  async create(params: CreateStoryParams): Promise<Story> {
    let mediaId = params.media_id
    if ((params.type === 'image' || params.type === 'video') && !mediaId) {
      if (!params.media) {
        throw new Error("stories.create: 'media' (file/URL) or 'media_id' is required for image/video stories")
      }
      const uploaded = await this.uploadMedia(params.media)
      mediaId = uploaded.media_id
    }
    return this.http.post(`${this.base}/createStory`, {
      media_id:          mediaId,
      media_type:        params.type,
      caption:           params.caption,
      audience:          params.audience,
      audience_user_ids: params.audience_user_ids,
    })
  }

  /**
   * Upload story media (image/video) and return its `media_id`.
   * Usually you don't call this directly — `create({ media })` does it for you.
   */
  async uploadMedia(input: FileInput): Promise<StoryMediaUpload> {
    const file = await resolveFileInput(input, 'story')
    return this.http.postForm(`${this.base}/uploadStoryMedia`, () => {
      const form = new FormData()
      const [blob, filename] = fileInputToBlob(file, 'story')
      form.append('file', blob, filename)
      return form
    })
  }

  /** Feed of your contacts' active stories. */
  list(): Promise<Story[]> {
    return this.http.post(`${this.base}/getStories`, {})
  }

  /** Your own stories. */
  listMine(): Promise<Story[]> {
    return this.http.post(`${this.base}/getMyStories`, {})
  }

  /** A single story by id (audience-checked server-side). */
  get(storyId: string): Promise<Story> {
    return this.http.post(`${this.base}/getStory`, { story_id: storyId })
  }

  /** Delete one of your stories. */
  delete(storyId: string): Promise<{ done: boolean }> {
    return this.http.post(`${this.base}/deleteStory`, { story_id: storyId })
  }

  /** Mark a story as viewed. */
  view(storyId: string): Promise<{ done: boolean }> {
    return this.http.post(`${this.base}/viewStory`, { story_id: storyId })
  }

  /** List who viewed one of your stories (owner only). */
  getViewers(storyId: string): Promise<StoryView[]> {
    return this.http.post(`${this.base}/getStoryViewers`, { story_id: storyId })
  }

  /** Get your default story audience preference. */
  getPreferences(): Promise<StoryPreferences> {
    return this.http.post(`${this.base}/getStoryPreferences`, {})
  }

  /** Set your default story audience preference. */
  setPreferences(prefs: StoryPreferences): Promise<{ done: boolean }> {
    return this.http.post(`${this.base}/setStoryPreferences`, prefs)
  }
}
