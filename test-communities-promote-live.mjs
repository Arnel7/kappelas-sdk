// Test LIVE du flux membre→admin. Lancer : node test-communities-promote-live.mjs <TOKEN>
import { KappelaBot, KappelaError } from './dist/index.mjs'

const TOKEN = process.argv[2] || process.env.KAPPELA_TOKEN
if (!TOKEN) { console.error('Usage: node ... <TOKEN>'); process.exit(1) }
const bot = new KappelaBot({ token: TOKEN })

async function step(label, fn, expectFail = false) {
  try {
    const r = await fn()
    console.log(`[${expectFail ? '?' : '✓'}] ${label}`, r ? JSON.stringify(r) : '')
    return { ok: true, r }
  } catch (e) {
    const m = e instanceof KappelaError ? `${e.error_code} (${e.status}): ${e.message}` : (e?.message ?? e)
    console.log(`[${expectFail ? '✓ erreur attendue' : '✗'}] ${label} → ${m}`)
    return { ok: false, e }
  }
}

let cid = null
try {
  const { r: c } = await step('create()', () => bot.communities.create({ name: 'SDK promote test (auto)' }))
  cid = c?.id
  const botUserId = c?.created_by
  console.log(`   commu id=${cid}  bot_user_id=${botUserId}`)

  // addMember sur le bot lui-même (déjà membre) → idempotent
  await step('addMember(bot, member) [idempotent]', () =>
    bot.communities.addMember({ community_id: cid, user_id: botUserId, role: 'member' }))

  // promoteMember(bot, admin) → no-op (déjà admin) → doit réussir → prouve l'endpoint promote
  await step('promoteMember(bot, admin)', () =>
    bot.communities.promoteMember({ community_id: cid, user_id: botUserId, role: 'admin' }))

  // addMember avec un UUID bidon → doit échouer (FK auth.users) → prouve la validation
  await step('addMember(uuid-bidon) [doit échouer]', () =>
    bot.communities.addMember({ community_id: cid, user_id: '00000000-0000-0000-0000-000000000000', role: 'member' }), true)

  // promoteMember(bot, member) → rétrograder le DERNIER admin → doit échouer (garde-fou)
  await step('promoteMember(bot, member) [dernier admin → refus]', () =>
    bot.communities.promoteMember({ community_id: cid, user_id: botUserId, role: 'member' }), true)
} finally {
  if (cid) await step('delete() cleanup', () => bot.communities.delete({ community_id: cid }))
}
process.exit(0)
