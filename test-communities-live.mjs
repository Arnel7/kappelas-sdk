// Test LIVE du module communautés contre le bot-service déployé.
// Lancer : node test-communities-live.mjs <TOKEN> [BASE_URL]
import { KappelaBot, KappelaError } from './dist/index.mjs'

const TOKEN = process.argv[2] || process.env.KAPPELA_TOKEN
const BASE  = process.argv[3] || process.env.KAPPELA_BASE_URL // ex: http://76.13.57.63:8080
if (!TOKEN) { console.error('Usage: node test-communities-live.mjs <TOKEN> [BASE_URL]'); process.exit(1) }

const bot = new KappelaBot(BASE ? { token: TOKEN, baseUrl: BASE } : { token: TOKEN })

function show(label, v) { console.log(`\n→ ${label}\n`, JSON.stringify(v, null, 2)) }
async function step(label, fn) {
  try { const r = await fn(); console.log(`[✓] ${label}`); return r }
  catch (e) {
    if (e instanceof KappelaError) console.error(`[✗] ${label} → ${e.error_code} (${e.status}): ${e.message}`)
    else console.error(`[✗] ${label} →`, e?.message ?? e)
    return null
  }
}

console.log(`Base: ${BASE ?? 'https://api.kappelas.com (défaut)'}`)

// 1) Lecture — communautés du bot + rôle
const list = await step('communities.list()', () => bot.communities.list())
if (list) show('Communautés du bot (avec role)', list.communities)
const admin = await step('communities.listAdmin()', () => bot.communities.listAdmin())
if (admin) console.log(`   → admin de ${admin.length} communauté(s)`)

// 2) Cycle write auto-nettoyé : create → list(role) → invite → revoke → delete
let createdId = null
try {
  const c = await step('communities.create({name})', () =>
    bot.communities.create({ name: 'SDK Test (auto, à supprimer)' }))
  if (c) { createdId = c.id; show('Créée', c) }

  if (createdId) {
    const l2 = await step('list() voit la nouvelle commu en admin', () => bot.communities.list())
    const mine = l2?.communities?.find(x => x.id === createdId)
    console.log(`   → role dans la commu créée : ${mine?.role}`)

    const inv = await step('createInviteLink()', () =>
      bot.communities.createInviteLink({ community_id: createdId, max_uses: 1, expires_in: '1h' }))
    if (inv) show('Lien invite', inv)
    if (inv?.code) await step('revokeInviteLink()', () =>
      bot.communities.revokeInviteLink({ community_id: createdId, code: inv.code }))
  }
} finally {
  if (createdId) await step('communities.delete() (cleanup)', () =>
    bot.communities.delete({ community_id: createdId }))
}

console.log('\nTerminé.')
process.exit(0)
