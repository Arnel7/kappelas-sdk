// ─── API envelope ────────────────────────────────────────────────────────────

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INVALID_FIELD'
  | 'MISSING_FIELD'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'CONFLICT'
  | 'METHOD_NOT_ALLOWED'
  | 'INVALID_PATH'
  | 'UPSTREAM_ERROR'

export interface ApiOk<T> { ok: true;  result: T }
export interface ApiErr   { ok: false; error: string; error_code: ErrorCode }
export type ApiResponse<T> = ApiOk<T> | ApiErr

// ─── Message ─────────────────────────────────────────────────────────────────

export type MessageType =
  | 'text' | 'image' | 'video' | 'audio' | 'document'
  | 'system' | 'poll' | 'sticker' | 'location' | 'contact'

export type MessageStatus = 'sent' | 'delivered' | 'read'

export interface ReplySnapshot {
  message_id: number
  sender_id:  string | null
  type:       MessageType
  text:       string | null
  media_id:   string | null
}

export interface Message {
  id:                 number
  chat_id:            number
  /**
   * Type of conversation this message belongs to.
   * - `"private"` — direct message between two users
   * - `"group"`   — group chat (multiple members)
   * - `"channel"` — broadcast channel (admin-only posting)
   *
   * Use this to adapt bot behaviour per context — e.g. reply with a quote
   * in groups, stay silent in channels, send a keyboard only in private.
   *
   * This field is always present on messages received via WebSocket or webhook.
   * It may be absent on messages fetched from the history API.
   */
  chat_type?:         ChatType
  sender_id:          string | null
  type:               MessageType
  text:               string | null
  media_id:           string | null
  extra_data:         unknown
  status:             MessageStatus
  edited_at:          number | null
  deleted_at:         number | null
  /** Unix timestamp (seconds) */
  created_at:         number
  reply_to_id:        number | null
  reply_to_snapshot:  ReplySnapshot | null
  mentions:           string[]
  forwarded_from:     unknown
  expires_at:         number | null
  sender_name?:       string | null
  sender_avatar_url?: string | null
  client_msg_id?:     string
  width?:             number | null
  height?:            number | null
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export type ChatType = 'private' | 'group' | 'channel'

export type ParticipantRole = 'member' | 'admin'

export interface Participant {
  id:         string
  /** Display name — mirrors the API field `nom`. */
  nom:        string
  is_bot:     boolean
  is_premium: boolean
  avatar_url: string | null
  /** Role in the conversation. Present on groups and channels; absent on private chats. */
  role?:      ParticipantRole
}

export interface Chat {
  chat_id:                number
  id:                     number
  type:                   ChatType
  title:                  string | null
  participants:           Participant[]
  /** ISO 8601 string */
  last_message_at:        string | null
  /** ISO 8601 string */
  created_at:             string
  created_by:             string
  is_pinned:              boolean
  is_premium:             boolean
  is_public:              boolean
  only_admins_can_write:  boolean
  labels:                 string[]
  description:            string | null
  avatar_url:             string | null
}

// ─── Profiles ────────────────────────────────────────────────────────────────

export interface BotProfile {
  user_id:     string
  username:    string
  is_bot:      true
  about:       string
  description: string
  avatar_url:  string | null
}

export type PrivacySetting = 'everyone' | 'contacts' | 'nobody'

export interface UserProfile {
  id:              string
  username:        string
  /** Display name — mirrors the API field `nom`. */
  nom:             string
  is_bot:          false
  is_premium:      boolean
  avatar_url:      string | null
  allow_group_add: PrivacySetting
  allow_calls:     PrivacySetting
}

// ─── Keyboards / markup ──────────────────────────────────────────────────────

export interface InlineKeyboardButton {
  text:           string
  callback_data?: string
  url?:           string
}

/**
 * A reply-keyboard button.
 * - Plain string: the label is both the displayed text and the callback value.
 * - Object form:  `text` is displayed; `callback_data` is sent to the webhook
 *   (falls back to `text` if omitted). Mirrors the behaviour of inline buttons.
 *
 * @example
 * // Short form (backwards-compatible)
 * keyboard: [["Option A", "Option B"], ["Annuler"]]
 *
 * // Long form — separate label and callback value
 * keyboard: [
 *   [{ text: "✅ Oui", callback_data: "confirm_yes" },
 *    { text: "❌ Non", callback_data: "confirm_no"  }],
 *   [{ text: "Annuler", callback_data: "cancel"     }],
 * ]
 */
export type ReplyKeyboardButton =
  | string
  | { text: string; callback_data?: string }

/**
 * A scroll-keyboard (horizontal chips) button.
 * Same dual format as {@link ReplyKeyboardButton}.
 *
 * @example
 * scroll_keyboard: ["📦 Commandes", "❓ Aide"]
 * // or with explicit callback data:
 * scroll_keyboard: [
 *   { text: "📦 Commandes", callback_data: "menu_orders" },
 *   { text: "❓ Aide",      callback_data: "menu_help"   },
 * ]
 */
export type ScrollKeyboardButton =
  | string
  | { text: string; callback_data?: string }

export interface InlineKeyboard   { inline_keyboard:   InlineKeyboardButton[][] }
export interface ReplyKeyboard    { keyboard:          ReplyKeyboardButton[][] }
export interface ScrollKeyboard   { scroll_keyboard:   ScrollKeyboardButton[] }

export type ReplyMarkup = InlineKeyboard | ReplyKeyboard | ScrollKeyboard

// ─── Action button ─────────────────────────────────────────────────────────────

/**
 * What tapping an {@link ActionButton} does. The meaning of `value` follows the type:
 *
 * - `'copy_text'`     — copies `value` to the clipboard (e.g. a one-time code / OTP).
 * - `'external_link'` — opens `value` (an external URL) in the in-app browser.
 * - `'internal_link'` — opens `value` as an in-app deep link.
 * - `'join'`          — `value` is an invite link (group / channel / community);
 *                       tapping joins directly, without a landing screen.
 */
export type ActionButtonType = 'copy_text' | 'external_link' | 'internal_link' | 'join' | 'open_webview'

/**
 * A single button rendered at the **foot of the message bubble** (WhatsApp-style),
 * distinct from inline keyboards. Unlike inline buttons it does not fire a
 * `callback_query` — it performs a client-side action (copy / open / join).
 *
 * Set it via `action_button` on {@link SendMessageParams}. If both `action_button`
 * and `reply_markup` are provided, **`action_button` takes precedence**.
 *
 * @example
 * // OTP code the user can copy with one tap
 * await bot.messages.send({
 *   chat_id: 42,
 *   text: 'Your verification code is 837192',
 *   action_button: { label: 'Copy code', type: 'copy_text', value: '837192' },
 * })
 *
 * @example
 * // External link button (opens the system browser, leaves the app)
 * await bot.messages.send({
 *   chat_id: 42,
 *   text: 'Read the docs:',
 *   action_button: { label: 'Open docs', type: 'external_link', value: 'https://kappelas.com/docs' },
 * })
 *
 * @example
 * // In-app WebView (stays inside Kappelas) — ideal for payments. The web page can
 * // close the sheet itself by calling `Kappelas.close()`, or the bot can close it
 * // remotely with {@link MessagesResource.closeWebview} (e.g. server-confirmed payment).
 * await bot.messages.send({
 *   chat_id: 42,
 *   text: 'Complete your payment:',
 *   action_button: { label: '💳 Pay now', type: 'open_webview', value: 'https://pay.example.com/xyz' },
 * })
 */
export interface ActionButton {
  /** Button label shown in the bubble footer (1–100 characters). */
  label: string
  /** What the button does — see {@link ActionButtonType}. */
  type:  ActionButtonType
  /** The button payload (1–2048 characters); its meaning depends on `type`. */
  value: string
}

/** Params for {@link MessagesResource.closeWebview}. */
export interface CloseWebviewParams {
  /** Conversation whose recipient(s) should have their in-app WebView closed. */
  chat_id: number
}

/** Result of {@link MessagesResource.closeWebview}. `sent` = number of recipients notified. */
export interface CloseWebviewResult {
  ok:   boolean
  sent: number
}

// ─── Carousel ────────────────────────────────────────────────────────────────

export interface CarouselCard {
  id:           string
  title:        string
  subtitle?:    string
  image_url?:   string
  button_text?: string
}

// ─── Webhook ─────────────────────────────────────────────────────────────────

export interface WebhookInfo {
  active:     boolean
  url:        string | null
  /** Unix timestamp (seconds) */
  created_at: number | null
}

// ─── Results ─────────────────────────────────────────────────────────────────

export interface SendResult {
  message_id: number
  created_at: number
}

export interface SendMediaResult extends SendResult {
  media_id: string
}

export interface SendCarouselResult extends SendResult {
  type: 'carousel'
}

export interface GetFileResult {
  media_id:     string
  /** Short-lived signed download URL (direct download, no auth header needed). */
  url:          string
  filename:     string
  content_type: string
  size_bytes:   number
  /** Seconds until `url` expires. */
  expires_in:   number
}

export interface ChatsResult {
  chats:    Chat[]
  has_more: boolean
}

export interface TypingResult {
  typing: boolean
}

export interface DeleteResult {
  deleted: boolean
}

export interface WebhookSetResult {
  url:    string
  active: true
}

export interface WebhookDeleteResult {
  active: false
}

// ─── Method params ───────────────────────────────────────────────────────────

/**
 * Recipient of a text message — provide **exactly one** of:
 *
 * - `chat_id` — numeric id of an existing conversation (private, group, or channel).
 * - `user_id` — UUID of a user; the message is routed to your 1-to-1 private chat
 *   with them.
 *
 * Behaviour of `user_id` differs by client:
 * - **`KappelaBot`** — the private conversation must already exist; a bot cannot
 *   start a conversation from scratch (the call fails with `FORBIDDEN`).
 * - **`KappelaUser`** — the private conversation is created automatically if it
 *   does not exist yet (find-or-create).
 *
 * `user_id` is only supported by `messages.send` (text). Media methods
 * (`sendPhoto`, `sendVideo`, …) still require `chat_id`.
 */
export type SendTarget =
  | { chat_id: number; user_id?: never }
  | { user_id: string; chat_id?: never }

export type SendMessageParams = SendTarget & {
  text:             string
  reply_markup?:    ReplyMarkup
  /**
   * A single foot-of-bubble action button (copy code / open link / join).
   * Takes precedence over `reply_markup` when both are set. See {@link ActionButton}.
   */
  action_button?:   ActionButton
  reply_to_id?:     number
  delete_previous?: boolean
}

/**
 * File input accepted by all `send*` media methods.
 *
 * - **`string`** — an HTTP/HTTPS URL; the SDK fetches the file automatically
 *   (mirroring Telegram's `file_id` / URL support).
 * - **`Buffer` / `Uint8Array` / `Blob`** — raw binary data.
 * - **object wrapper** — binary data with explicit `filename` and `contentType`
 *   metadata (recommended when the MIME type cannot be inferred).
 *
 * @example
 * // URL — simplest form
 * await bot.messages.sendPhoto({ chat_id, photo: 'https://example.com/banner.jpg' })
 *
 * // Buffer with metadata
 * await bot.messages.sendPhoto({ chat_id, photo: { data: buf, filename: 'photo.png', contentType: 'image/png' } })
 */
export type FileInput =
  | string
  | Buffer
  | Uint8Array
  | Blob
  | { data: Buffer | Uint8Array | Blob; filename?: string; contentType?: string }

export type SendPhotoParams = SendTarget & {
  photo:            FileInput
  caption?:         string
  reply_to_id?:     number
  delete_previous?: boolean
  reply_markup?:    ReplyMarkup
}

export type SendVideoParams = SendTarget & {
  video:            FileInput
  caption?:         string
  reply_to_id?:     number
  delete_previous?: boolean
  reply_markup?:    ReplyMarkup
}

export type SendDocumentParams = SendTarget & {
  document:         FileInput
  caption?:         string
  reply_to_id?:     number
  delete_previous?: boolean
  reply_markup?:    ReplyMarkup
}

export type SendAudioParams = SendTarget & {
  audio:            FileInput
  caption?:         string
  reply_to_id?:     number
  delete_previous?: boolean
  reply_markup?:    ReplyMarkup
}

export type SendCarouselParams = SendTarget & {
  text?:                 string
  carousel:              CarouselCard[]
  /**
   * Boutons de réponse rapide sous le carousel.
   * Accepte la forme courte (string) ou longue ({ text, callback_data }).
   * Identique à {@link ScrollKeyboardButton} — le label affiché peut différer
   * de la valeur envoyée au webhook.
   *
   * @example
   * // Forme courte
   * quick_reply_buttons: ['Voir plus', 'Annuler']
   *
   * // Forme longue — label ≠ callback
   * quick_reply_buttons: [
   *   { text: '📦 Voir plus', callback_data: 'show_more' },
   *   { text: '✖ Annuler',    callback_data: 'cancel'    },
   * ]
   */
  quick_reply_buttons?:  ScrollKeyboardButton[]
  /** Quote un message existant — affiche la bannière de citation dans les groupes. */
  reply_to_id?:          number
  /** Supprime le dernier message du bot dans ce chat avant d'envoyer. */
  delete_previous?:      boolean
}

export type SendTypingParams = SendTarget & {
  is_typing?: boolean
  /**
   * Distinct activity indicator (Telegram-style). When set, the recipient sees
   * e.g. "recording audio…" instead of "typing…". Sent automatically by the
   * media send methods. One of: `recording_audio`, `sending_photo`,
   * `sending_video`, `sending_document`.
   */
  action?: string
}

export type DeleteMessageParams = SendTarget & {
  message_id: number
}

export interface SetWebhookParams {
  url:     string
  secret?: string
}

export interface GetChatsParams {
  limit?:  number
  offset?: number
}

// ─── Chat member management ──────────────────────────────────────────────────

/** Minimal member info returned by `getChatMember` and `getChatAdministrators`. */
export interface ChatMemberInfo {
  /** UUID of the member. */
  user_id: string
  /** Role in the conversation. */
  role:    ParticipantRole
}

export interface AddChatMemberParams {
  chat_id: number
  /** UUID of the user to add. **Bot must be admin.** */
  user_id: string
}

export interface AddChatMemberResult {
  description: string
}

export interface BanChatMemberParams {
  chat_id: number
  /**
   * UUID of the user to remove.
   * Cannot be the bot itself — use `leaveChat` instead.
   * **Bot must be admin.**
   */
  user_id: string
}

export interface BanChatMemberResult {
  description: string
}

export interface LeaveChatParams {
  chat_id: number
}

export interface LeaveChatResult {
  description: string
}

export interface PromoteChatMemberParams {
  chat_id: number
  /** UUID of the member whose role to change. **Bot must be admin.** */
  user_id: string
  /** New role: `"admin"` promotes, `"member"` demotes. */
  role:    ParticipantRole
}

export interface PromoteChatMemberResult {
  user_id: string
  role:    ParticipantRole
}

export interface GetChatAdministratorsParams {
  chat_id: number
}

export interface GetChatAdministratorsResult {
  /** All members whose role is `"admin"` (includes the bot if it is admin). */
  admins: ChatMemberInfo[]
}

export interface GetChatMemberParams {
  chat_id: number
  /** UUID of the member to look up. */
  user_id: string
}

// ─── Invite links ────────────────────────────────────────────────────────────

/** An active invite link for a group or channel. */
export interface ChatInviteLink {
  /** Short code used in the URL (e.g. `"aBcD123xyz"`). */
  code:            string
  /** Full invite URL (e.g. `"https://kappelas.com/invite/aBcD123xyz"`). */
  url:             string
  /** Number of allowed uses. `0` = unlimited. */
  max_uses:        number
  /** Current number of times this link has been used. */
  use_count:       number
  /** Expiry as Unix timestamp (seconds), or `null` if permanent. */
  expires_at:      number | null
  /** Creation time as Unix timestamp (seconds). */
  created_at:      number
}

export interface CreateChatInviteLinkParams {
  chat_id:     number
  /** `0` = unlimited (default), `1`+ = capped. */
  max_uses?:   number
  /** `"1h"` | `"24h"` | `"7d"` | `"30d"` | `"never"` (default). */
  expires_in?: '1h' | '24h' | '7d' | '30d' | 'never'
}

export interface GetChatInviteLinksParams {
  chat_id: number
}

export interface GetChatInviteLinksResult {
  invite_links: ChatInviteLink[]
}

export interface RevokeChatInviteLinkParams {
  chat_id: number
  /** The `code` field of the link to revoke. */
  code:    string
}

export interface RevokeChatInviteLinkResult {
  revoked: boolean
  code:    string
}

// ─── getMyGroups ─────────────────────────────────────────────────────────────

/**
 * A group or channel the bot is a member of, enriched with the bot's own role.
 */
export interface BotGroupEntry {
  /** Conversation ID — use this as `chat_id` in all API calls. */
  chat_id:           number
  /** `"group"` or `"channel"`. Never `"private"`. */
  type:              Exclude<ChatType, 'private'>
  /** Group or channel title. */
  title:             string | null
  /** Total number of participants (including the bot). */
  participant_count: number
  /** The bot's role in this conversation. */
  bot_role:          ParticipantRole
}

export interface GetMyGroupsResult {
  groups: BotGroupEntry[]
}

// ─── Edit message ────────────────────────────────────────────────────────────

export type EditMessageParams = SendTarget & {
  message_id:     number
  /** New text. Required unless new_extra_data is set (inline keyboard edit). */
  new_text?:      string
  /** Replace the inline keyboard without changing the text. */
  new_extra_data?: ReplyMarkup | null
}

export interface EditMessageResult {
  edited:     boolean
  message_id: number
}

// ─── Callback query ──────────────────────────────────────────────────────────

/** Fired when a user clicks an inline button. */
export interface CallbackQuery {
  chat_id:          number
  /**
   * ID of the message that carried the clicked inline keyboard.
   * Use it with `messages.edit({ message_id })` to update that message
   * (e.g. swap the buttons), or to `reply()` to it. `null` for older
   * clients that don't send it.
   */
  message_id:       number | null
  /** UUID of the user who clicked the button. */
  sender_id:        string
  /** Display name of the user who clicked (e.g. "Arnel LAWSON"). Null if unresolvable. */
  sender_name:      string | null
  /** Username of the user who clicked (e.g. "arnell"). Null if unresolvable. */
  sender_username:  string | null
  /** Value of `callback_data` on the button that was clicked. */
  callback_data:    string
  /** Unix timestamp (seconds). */
  sent_at:          number
}

// ─── WS events ───────────────────────────────────────────────────────────────

export interface WSMessageEvent       { type: 'message';        data: Message }
export interface WSCallbackQueryEvent { type: 'callback_query'; data: CallbackQuery }
export type KappelaWireEvent =
  | WSMessageEvent
  | WSCallbackQueryEvent
  | { type: string; data: unknown }

// ─── Communities ───────────────────────────────────────────────────────────────

/** Résultat générique des actions communautés sans corps (204). */
export interface DoneResult { done?: boolean; pending?: boolean }

export interface Community {
  id:                       number
  name:                     string
  description:              string | null
  avatar_url:               string | null
  created_by:               string
  /** Canal « Annonces » obligatoire de la communauté. */
  announcement_channel_id:  number | null
  /** `true` = adhésion sur autorisation (demande requise). */
  requires_approval:        boolean
  /** ISO 8601. */
  created_at:               string
  /**
   * Rôle du bot/user DANS LA COMMUNAUTÉ (`"member"` | `"admin"`).
   * Renseigné par `communities.list()` uniquement.
   *
   * ⚠️ Nuance : c'est le rôle dans la COMMUNAUTÉ. Être admin d'un GROUPE rattaché
   * à la communauté n'implique PAS d'être admin de la communauté (portées distinctes).
   */
  role?:                    'member' | 'admin'
}

export interface CommunityMember {
  community_id: number
  user_id:      string
  role:         'member' | 'admin'
  /** ISO 8601. */
  joined_at:    string
}

/** Groupe lié à une communauté, avec le statut du demandeur courant. */
export interface CommunityGroup {
  id:                 number
  type:               string
  title:              string | null
  avatar_url?:        string | null
  joined:             boolean
  pending:            boolean
  participants_count: number
  [key: string]:      unknown
}

export interface CommunityDetail {
  community: Community
  groups:    CommunityGroup[]
  members:   CommunityMember[]
}

export interface CommunityInvite {
  code:         string
  community_id: number
  created_by:   string
  /** `0` = illimité, `1`+ = limité. */
  max_uses:     number
  use_count:    number
  /** ISO 8601 ou `null` si permanent. */
  expires_at:   string | null
  /** ISO 8601 ou `null` si actif. */
  revoked_at:   string | null
  created_at:   string
}

export interface CommunityJoinRequest {
  id:                    number
  community_id:          number
  user_id:               string
  status:                string
  created_at:            string
  /** Enrichi côté serveur. */
  requester_name?:       string
  requester_avatar_url?: string | null
}

export interface CommunityGroupRequest {
  id:              number
  community_id:    number
  conversation_id: number
  group_name:      string
  requested_by:    string
  status:          string
  created_at:      string
}

export interface GetMyCommunitiesResult { communities: Community[] }
export interface GetCommunityInviteLinksResult { invites: CommunityInvite[] }

export interface CreateCommunityParams {
  name:              string
  description?:      string
  avatar_url?:       string
  requires_approval?: boolean
}

export interface GetCommunityParams { community_id: number }
export interface LeaveCommunityParams { community_id: number }
export interface CommunityInviteCodeParams { code: string }

export interface UpdateCommunityParams {
  community_id:             number
  name?:                    string
  description?:             string | null
  avatar_url?:              string | null
  announcement_channel_id?: number | null
  requires_approval?:       boolean
}

/** Aperçu public d'une communauté via un lien d'invitation. */
export interface CommunityInvitePreview {
  code:           string
  community_id:   number
  community_name: string
  member_count:   number
  expires_at:     string | null
  avatar_url:     string | null
  description:    string | null
}

export interface AddCommunityMemberParams {
  community_id: number
  user_id:      string
  /** Défaut `"member"`. */
  role?:        'member' | 'admin'
}

export interface PromoteCommunityMemberParams {
  community_id: number
  user_id:      string
  role:         'member' | 'admin'
}

export interface BanCommunityMemberParams {
  community_id: number
  user_id:      string
}

export interface CreateCommunityInviteLinkParams {
  community_id: number
  /** `0` = illimité (défaut), `1`+ = limité. */
  max_uses?:    number
  expires_in?:  '1h' | '24h' | '7d' | '30d' | 'never'
}

export interface RevokeCommunityInviteLinkParams {
  community_id: number
  code:         string
}

export interface CommunityRequestActionParams {
  community_id: number
  request_id:   number
}

export interface AddCommunityGroupParams {
  community_id:    number
  conversation_id: number
}

export interface RemoveCommunityGroupParams {
  community_id:    number
  conversation_id: number
}

// ─── Stories ─────────────────────────────────────────────────────────────────

export type StoryMediaType = 'image' | 'video' | 'text' | 'poll'
export type StoryAudience  = 'all' | 'selected' | 'excluded'

export interface Story {
  id:                 string
  user_id:            string
  media_id:           string
  media_type:         StoryMediaType
  caption:            string
  /** ISO 8601 — expiry (stories last 24 h). */
  expires_at:         string
  view_count:         number
  /** ISO 8601. */
  created_at:         string
  audience:           StoryAudience
  audience_user_ids?: string[]
  /** Enriched on read. */
  author_name?:       string
  author_avatar?:     string | null
  viewed_by_me?:      boolean
  media_url?:         string | null
}

export interface StoryView {
  story_id:       string
  viewer_id:      string
  /** ISO 8601. */
  viewed_at:      string
  viewer_name?:   string
  viewer_avatar?: string | null
}

/** Result of uploading story media (image/video) before creating the story. */
export interface StoryMediaUpload {
  media_id:       string
  url:            string
  width?:         number
  height?:        number
  thumbnail_url?: string
  medium_url?:    string
}

export interface StoryPreferences {
  audience:          StoryAudience
  audience_user_ids: string[]
}

export interface CreateStoryParams {
  /** `image` | `video` need media; `text` | `poll` are caption-only. */
  type:               StoryMediaType
  /**
   * Image/video file or HTTP URL — the SDK uploads it automatically and uses
   * the resulting media id. Ignored for `text`/`poll`.
   */
  media?:             FileInput
  /** Alternative to `media`: an already-uploaded media id. */
  media_id?:          string
  caption?:           string
  /**
   * Clickable CTA link shown over the story in the Kappela apps. When set, the
   * SDK encodes the caption as a JSON envelope ({ text, link, linkLabel }) — the
   * format the apps read (there is no separate backend field).
   */
  link?:              string
  /** Optional label for the CTA link (e.g. "Shop now"). Requires `link`. */
  link_label?:        string
  /** `all` (default) | `selected` | `excluded`. */
  audience?:          StoryAudience
  /** Required when `audience` is `selected` or `excluded`. */
  audience_user_ids?: string[]
}
