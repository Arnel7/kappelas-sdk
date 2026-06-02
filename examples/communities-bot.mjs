// Exemple : gérer des communautés avec un bot.
//
//   KAPPELA_TOKEN=xxxx node examples/communities-bot.mjs
//
// Le bot doit être ADMIN d'une communauté pour la gérer. Pour rendre quelqu'un
// (personne OU bot) admin : on l'ajoute d'abord comme membre, puis on le promeut.
import { KappelaBot } from '@kappelas/sdk'

const bot = new KappelaBot({ token: process.env.KAPPELA_TOKEN })

// 1) Lister mes communautés + savoir où je suis admin
const { communities } = await bot.communities.list()
for (const c of communities) console.log(`#${c.id} ${c.name} → ${c.role}`) // 'member' | 'admin'

const adminOf = await bot.communities.listAdmin()
console.log(`Admin de ${adminOf.length} communauté(s)`)

// 2) Créer une communauté (le bot en devient admin)
const community = await bot.communities.create({
  name: 'Ma communauté',
  description: 'Créée depuis le SDK',
  requires_approval: true,           // adhésion sur autorisation
})
const id = community.id

// 3) Ajouter un membre puis le promouvoir admin (même flux pour un user ou un bot)
await bot.communities.addMember({ community_id: id, user_id: '<uuid-or-bot_user_id>', role: 'member' })
await bot.communities.promoteMember({ community_id: id, user_id: '<uuid>', role: 'admin' })

// 4) Lien d'invitation (usage unique, 24 h)
const invite = await bot.communities.createInviteLink({ community_id: id, max_uses: 1, expires_in: '24h' })
console.log('Lien :', invite.code)

// 5) Traiter les demandes d'adhésion (mode « sur autorisation »)
const requests = await bot.communities.getJoinRequests({ community_id: id })
for (const r of requests) {
  console.log(`Demande de ${r.requester_name ?? r.user_id}`)
  await bot.communities.approveJoinRequest({ community_id: id, request_id: r.id })
}

// 6) Lier un groupe existant à la communauté (le bot doit être admin du groupe)
// await bot.communities.addGroup({ community_id: id, conversation_id: 42 })

// 7) Retirer un membre / quitter
// await bot.communities.banMember({ community_id: id, user_id: '<uuid>' })
// await bot.communities.leave({ community_id: id })

console.log('Terminé.')
process.exit(0)
