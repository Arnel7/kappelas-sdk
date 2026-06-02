import type { HttpClient } from '../http.js'
import type {
  Community,
  CommunityDetail,
  CommunityInvite,
  CommunityInvitePreview,
  CommunityMember,
  CommunityJoinRequest,
  CommunityGroupRequest,
  GetMyCommunitiesResult,
  CreateCommunityParams,
  UpdateCommunityParams,
  GetCommunityParams,
  CommunityInviteCodeParams,
  AddCommunityMemberParams,
  PromoteCommunityMemberParams,
  BanCommunityMemberParams,
  LeaveCommunityParams,
  CreateCommunityInviteLinkParams,
  GetCommunityInviteLinksResult,
  RevokeCommunityInviteLinkParams,
  CommunityRequestActionParams,
  AddCommunityGroupParams,
  RemoveCommunityGroupParams,
  DoneResult,
} from '../types.js'

/**
 * Gestion des **communautés** par un bot (mêmes droits qu'un utilisateur admin).
 *
 * Un bot peut administrer une communauté **dont il est admin**. Pour rendre quelqu'un
 * (personne OU bot) admin, le flux est en deux temps — d'abord membre, puis promotion :
 *
 * @example
 * // 1) ajouter comme membre   2) promouvoir admin
 * await bot.communities.addMember({ community_id: 7, user_id: 'uuid', role: 'member' })
 * await bot.communities.promoteMember({ community_id: 7, user_id: 'uuid', role: 'admin' })
 *
 * // Un bot s'ajoute lui-même de la même façon (son propre bot_user_id).
 */
export class CommunitiesResource {
  constructor(private http: HttpClient, private base: string) {}

  // ── Lecture / CRUD ──────────────────────────────────────────────────────────

  /**
   * Liste les communautés dont le bot est membre.
   * @example
   * const { communities } = await bot.communities.list()
   */
  list(): Promise<GetMyCommunitiesResult> {
    return this.http.post(`${this.base}/getMyCommunities`, {})
  }

  /**
   * Communautés où le bot est **admin de la communauté** (filtre `role === 'admin'`).
   *
   * ⚠️ C'est le rôle DANS LA COMMUNAUTÉ. Être admin d'un groupe rattaché à une
   * communauté ne rend PAS admin de la communauté (portées distinctes).
   *
   * @example
   * const admin = await bot.communities.listAdmin()
   * console.log(`Admin de ${admin.length} communauté(s)`)
   */
  async listAdmin(): Promise<Community[]> {
    const { communities } = await this.list()
    return communities.filter(c => c.role === 'admin')
  }

  /**
   * Détail d'une communauté (infos + groupes + membres). Le bot doit en être membre.
   * @example
   * const { community, groups, members } = await bot.communities.get({ community_id: 7 })
   */
  get(params: GetCommunityParams): Promise<CommunityDetail> {
    return this.http.post(`${this.base}/getCommunity`, params)
  }

  /**
   * Crée une communauté (le bot en devient admin).
   * @example
   * const c = await bot.communities.create({ name: 'Devs', requires_approval: true })
   */
  create(params: CreateCommunityParams): Promise<Community> {
    return this.http.post(`${this.base}/createCommunity`, params)
  }

  /**
   * Modifie une communauté (seuls les champs fournis). **Le bot doit être admin.**
   * @example
   * await bot.communities.update({ community_id: 7, description: 'Nouvelle desc', requires_approval: false })
   */
  update(params: UpdateCommunityParams): Promise<Community> {
    return this.http.post(`${this.base}/updateCommunity`, params)
  }

  /** Supprime une communauté. **Le bot doit être admin.** */
  delete(params: GetCommunityParams): Promise<DoneResult> {
    return this.http.post(`${this.base}/deleteCommunity`, params)
  }

  /**
   * Le bot rejoint une communauté. Publique → membre immédiat ; sur autorisation →
   * demande en attente (`result.pending === true`).
   * @example
   * const r = await bot.communities.join({ community_id: 7 })
   * if (r.pending) console.log('en attente d’approbation')
   */
  join(params: GetCommunityParams): Promise<DoneResult> {
    return this.http.post(`${this.base}/joinCommunity`, params)
  }

  // ── Membres ─────────────────────────────────────────────────────────────────

  /**
   * Ajoute un membre (personne ou bot). **Le bot doit être admin de la communauté.**
   * `role` par défaut : `"member"`.
   * @example
   * await bot.communities.addMember({ community_id: 7, user_id: 'uuid' })
   */
  addMember(params: AddCommunityMemberParams): Promise<DoneResult> {
    return this.http.post(`${this.base}/addCommunityMember`, params)
  }

  /**
   * Promeut (`role:"admin"`) ou rétrograde (`role:"member"`) un membre.
   * **Le bot doit être admin.** Le membre doit déjà exister (ajoute-le d'abord).
   * @example
   * await bot.communities.promoteMember({ community_id: 7, user_id: 'uuid', role: 'admin' })
   */
  promoteMember(params: PromoteCommunityMemberParams): Promise<DoneResult> {
    return this.http.post(`${this.base}/promoteCommunityMember`, params)
  }

  /**
   * Retire un membre. **Le bot doit être admin** (ou retire son propre user_id).
   * @example
   * await bot.communities.banMember({ community_id: 7, user_id: 'uuid' })
   */
  banMember(params: BanCommunityMemberParams): Promise<DoneResult> {
    return this.http.post(`${this.base}/banCommunityMember`, params)
  }

  /**
   * Le bot quitte la communauté.
   * @example
   * await bot.communities.leave({ community_id: 7 })
   */
  leave(params: LeaveCommunityParams): Promise<DoneResult> {
    return this.http.post(`${this.base}/leaveCommunity`, params)
  }

  // ── Liens d'invitation (admin) ───────────────────────────────────────────────

  /**
   * Crée un lien d'invitation à la communauté. **Le bot doit être admin.**
   * `max_uses`: 0 = illimité, 1 = usage unique. `expires_in`: "1h"|"24h"|"7d"|"30d"|"never".
   * @example
   * const inv = await bot.communities.createInviteLink({ community_id: 7, max_uses: 1, expires_in: '24h' })
   */
  createInviteLink(params: CreateCommunityInviteLinkParams): Promise<CommunityInvite> {
    return this.http.post(`${this.base}/createCommunityInviteLink`, params)
  }

  /** Liste les liens d'invitation actifs. **Le bot doit être admin.** */
  getInviteLinks(params: GetCommunityParams): Promise<GetCommunityInviteLinksResult> {
    return this.http.post(`${this.base}/getCommunityInviteLinks`, params)
  }

  /** Révoque un lien d'invitation. **Le bot doit être admin.** */
  revokeInviteLink(params: RevokeCommunityInviteLinkParams): Promise<DoneResult> {
    return this.http.post(`${this.base}/revokeCommunityInviteLink`, params)
  }

  /**
   * Aperçu d'une communauté depuis un code d'invitation (nom, nb de membres, expiration).
   * @example
   * const p = await bot.communities.previewInvite({ code: 'aBcD123xyz' })
   */
  previewInvite(params: CommunityInviteCodeParams): Promise<CommunityInvitePreview> {
    return this.http.post(`${this.base}/previewCommunityInvite`, params)
  }

  /**
   * Le bot rejoint une communauté via un code d'invitation.
   * @example
   * const { community_id } = await bot.communities.acceptInvite({ code: 'aBcD123xyz' })
   */
  acceptInvite(params: CommunityInviteCodeParams): Promise<{ community_id: number }> {
    return this.http.post(`${this.base}/acceptCommunityInvite`, params)
  }

  // ── Demandes d'adhésion (user → communauté) ──────────────────────────────────

  /** Liste les demandes d'adhésion en attente (mode « sur autorisation »). Admin requis. */
  getJoinRequests(params: GetCommunityParams): Promise<CommunityJoinRequest[]> {
    return this.http.post(`${this.base}/getCommunityJoinRequests`, params)
  }

  /** Approuve une demande d'adhésion. Admin requis. */
  approveJoinRequest(params: CommunityRequestActionParams): Promise<DoneResult> {
    return this.http.post(`${this.base}/approveCommunityJoinRequest`, params)
  }

  /** Rejette une demande d'adhésion. Admin requis. */
  rejectJoinRequest(params: CommunityRequestActionParams): Promise<DoneResult> {
    return this.http.post(`${this.base}/rejectCommunityJoinRequest`, params)
  }

  // ── Groupes de la communauté ─────────────────────────────────────────────────

  /** Lie un groupe à la communauté (le bot doit être admin commu ET admin du groupe). */
  addGroup(params: AddCommunityGroupParams): Promise<DoneResult> {
    return this.http.post(`${this.base}/addCommunityGroup`, params)
  }

  /** Délie un groupe de la communauté (admin commu OU admin du groupe). */
  removeGroup(params: RemoveCommunityGroupParams): Promise<DoneResult> {
    return this.http.post(`${this.base}/removeCommunityGroup`, params)
  }

  /** Liste les demandes de groupes voulant rejoindre la communauté. Admin requis. */
  getGroupRequests(params: GetCommunityParams): Promise<CommunityGroupRequest[]> {
    return this.http.post(`${this.base}/getCommunityGroupRequests`, params)
  }

  /** Approuve une demande de groupe (lie le groupe). Admin requis. */
  approveGroupRequest(params: CommunityRequestActionParams): Promise<DoneResult> {
    return this.http.post(`${this.base}/approveCommunityGroupRequest`, params)
  }

  /** Rejette une demande de groupe. Admin requis. */
  rejectGroupRequest(params: CommunityRequestActionParams): Promise<DoneResult> {
    return this.http.post(`${this.base}/rejectCommunityGroupRequest`, params)
  }
}

// Réexport pratique des types liés aux communautés.
export type {
  Community,
  CommunityDetail,
  CommunityInvite,
  CommunityMember,
  CommunityJoinRequest,
  CommunityGroupRequest,
}
