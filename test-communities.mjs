// Tests unitaires du module communautés (mock de fetch — aucune connexion réseau réelle).
// Vérifie pour chaque méthode : bon endpoint /v1/{token}/{method}, bon payload, résultat parsé.
//
// Lancer : node test-communities.mjs
import { KappelaBot } from './dist/index.mjs'

const TOKEN = 'test-token'
const BASE  = `https://api.kappelas.com/v1/${TOKEN}`

const calls = []
let nextResult = { ok: true }

// Mock global fetch — capture la requête, renvoie {ok:true, result}.
globalThis.fetch = async (url, init) => {
  calls.push({ url, method: init?.method, body: init?.body ? JSON.parse(init.body) : undefined })
  return {
    status: 200,
    ok: true,
    headers: { get: () => null },
    json: async () => ({ ok: true, result: nextResult }),
  }
}

const bot = new KappelaBot({ token: TOKEN })

let pass = 0, fail = 0
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b)
function check(name, cond, got) {
  if (cond) { pass++; console.log(`  [✓] ${name}`) }
  else { fail++; console.error(`  [✗] ${name} — got: ${got}`) }
}

async function expectCall(label, fn, method, expectedBody) {
  calls.length = 0
  await fn()
  const c = calls[calls.length - 1]
  check(`${label} → ${method}`, !!c && c.url === `${BASE}/${method}`, c?.url)
  if (expectedBody !== undefined) {
    check(`${label} payload`, eq(c?.body, expectedBody), JSON.stringify(c?.body))
  }
}

console.log('\n=== Tests module communautés (mock) ===\n')

// CRUD / lecture
await expectCall('list',   () => bot.communities.list(),                       'getMyCommunities', {})
await expectCall('get',    () => bot.communities.get({ community_id: 7 }),      'getCommunity',     { community_id: 7 })
await expectCall('create', () => bot.communities.create({ name: 'Devs', requires_approval: true }), 'createCommunity', { name: 'Devs', requires_approval: true })
await expectCall('update', () => bot.communities.update({ community_id: 7, description: 'd' }), 'updateCommunity', { community_id: 7, description: 'd' })
await expectCall('delete', () => bot.communities.delete({ community_id: 7 }),   'deleteCommunity',  { community_id: 7 })
await expectCall('join',   () => bot.communities.join({ community_id: 7 }),     'joinCommunity',    { community_id: 7 })

// Membres
await expectCall('addMember',     () => bot.communities.addMember({ community_id: 7, user_id: 'u', role: 'member' }), 'addCommunityMember',     { community_id: 7, user_id: 'u', role: 'member' })
await expectCall('promoteMember', () => bot.communities.promoteMember({ community_id: 7, user_id: 'u', role: 'admin' }), 'promoteCommunityMember', { community_id: 7, user_id: 'u', role: 'admin' })
await expectCall('banMember',     () => bot.communities.banMember({ community_id: 7, user_id: 'u' }), 'banCommunityMember', { community_id: 7, user_id: 'u' })
await expectCall('leave',         () => bot.communities.leave({ community_id: 7 }), 'leaveCommunity', { community_id: 7 })

// Invites
await expectCall('createInviteLink', () => bot.communities.createInviteLink({ community_id: 7, max_uses: 1, expires_in: '24h' }), 'createCommunityInviteLink', { community_id: 7, max_uses: 1, expires_in: '24h' })
await expectCall('getInviteLinks',   () => bot.communities.getInviteLinks({ community_id: 7 }), 'getCommunityInviteLinks', { community_id: 7 })
await expectCall('revokeInviteLink', () => bot.communities.revokeInviteLink({ community_id: 7, code: 'c' }), 'revokeCommunityInviteLink', { community_id: 7, code: 'c' })
await expectCall('previewInvite',    () => bot.communities.previewInvite({ code: 'c' }), 'previewCommunityInvite', { code: 'c' })
await expectCall('acceptInvite',     () => bot.communities.acceptInvite({ code: 'c' }), 'acceptCommunityInvite', { code: 'c' })

// Demandes d'adhésion (user)
await expectCall('getJoinRequests',     () => bot.communities.getJoinRequests({ community_id: 7 }), 'getCommunityJoinRequests', { community_id: 7 })
await expectCall('approveJoinRequest',  () => bot.communities.approveJoinRequest({ community_id: 7, request_id: 3 }), 'approveCommunityJoinRequest', { community_id: 7, request_id: 3 })
await expectCall('rejectJoinRequest',   () => bot.communities.rejectJoinRequest({ community_id: 7, request_id: 3 }), 'rejectCommunityJoinRequest', { community_id: 7, request_id: 3 })

// Demandes de groupe + groupes
await expectCall('getGroupRequests',    () => bot.communities.getGroupRequests({ community_id: 7 }), 'getCommunityGroupRequests', { community_id: 7 })
await expectCall('approveGroupRequest', () => bot.communities.approveGroupRequest({ community_id: 7, request_id: 3 }), 'approveCommunityGroupRequest', { community_id: 7, request_id: 3 })
await expectCall('rejectGroupRequest',  () => bot.communities.rejectGroupRequest({ community_id: 7, request_id: 3 }), 'rejectCommunityGroupRequest', { community_id: 7, request_id: 3 })
await expectCall('addGroup',            () => bot.communities.addGroup({ community_id: 7, conversation_id: 9 }), 'addCommunityGroup', { community_id: 7, conversation_id: 9 })
await expectCall('removeGroup',         () => bot.communities.removeGroup({ community_id: 7, conversation_id: 9 }), 'removeCommunityGroup', { community_id: 7, conversation_id: 9 })

// Le résultat de l'enveloppe {ok,result} est bien déballé
nextResult = { communities: [{ id: 1, name: 'A' }] }
const r = await bot.communities.list()
check('résultat déballé (payload.result)', eq(r, nextResult), JSON.stringify(r))

// listAdmin() ne garde que role==='admin' (rôle communauté, pas groupe)
nextResult = { communities: [
  { id: 1, name: 'A', role: 'admin' },
  { id: 2, name: 'B', role: 'member' },
  { id: 3, name: 'C', role: 'admin' },
] }
const admins = await bot.communities.listAdmin()
check('listAdmin filtre role=admin', eq(admins.map(c => c.id), [1, 3]), JSON.stringify(admins.map(c => c.id)))

// Flux "membre puis admin" (user ET bot, même user_id)
calls.length = 0
await bot.communities.addMember({ community_id: 7, user_id: 'bot-uuid', role: 'member' })
await bot.communities.promoteMember({ community_id: 7, user_id: 'bot-uuid', role: 'admin' })
check('flux membre→admin (2 appels)', calls.length === 2 &&
  calls[0].url.endsWith('/addCommunityMember') && calls[1].url.endsWith('/promoteCommunityMember'),
  calls.map(c => c.url).join(', '))

console.log(`\n=== ${pass} passés, ${fail} échoués ===`)
process.exit(fail === 0 ? 0 : 1)
