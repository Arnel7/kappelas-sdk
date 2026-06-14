// Tests for the chat_id | user_id send target (offline, mock HTTP server).
// Verifies the SDK forwards the correct payload to /sendMessage for both
// KappelaBot and KappelaUser, and that reply() fixes the recipient.
import http from 'node:http'
import assert from 'node:assert/strict'
import { KappelaBot, KappelaUser } from './dist/index.mjs'

let lastReq = null

// Mock backend: records the last request and returns a valid envelope.
const server = http.createServer((req, res) => {
  let raw = ''
  req.on('data', (c) => { raw += c })
  req.on('end', () => {
    let body = null
    try { body = raw ? JSON.parse(raw) : null } catch { /* multipart — keep raw */ }
    lastReq = { path: req.url, method: req.method, body, raw }
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ ok: true, result: { message_id: 1, created_at: 1700000000, media_id: 'm1' } }))
  })
})

await new Promise((r) => server.listen(0, r))
const port = server.address().port
const baseUrl = `http://127.0.0.1:${port}`

let passed = 0
function ok(name) { console.log(`  ✓ ${name}`); passed++ }

try {
  const bot = new KappelaBot({ token: 'TESTTOKEN', baseUrl })
  const me  = new KappelaUser({ apiKey: 'sk_test', baseUrl })

  // 1. Bot send by chat_id
  await bot.messages.send({ chat_id: 42, text: 'hi' })
  assert.equal(lastReq.path, '/v1/TESTTOKEN/sendMessage')
  assert.equal(lastReq.body.chat_id, 42)
  assert.equal(lastReq.body.text, 'hi')
  assert.equal(lastReq.body.user_id, undefined)
  ok('bot send by chat_id → {chat_id} sent, no user_id')

  // 2. Bot send by user_id
  const uuid = 'f19f2127-7892-44a6-bae7-5d2c88ee3b09'
  await bot.messages.send({ user_id: uuid, text: 'yo' })
  assert.equal(lastReq.body.user_id, uuid)
  assert.equal(lastReq.body.chat_id, undefined)
  assert.equal(lastReq.body.text, 'yo')
  ok('bot send by user_id → {user_id} sent, no chat_id')

  // 3. Bot reply on a message → fixes chat_id + reply_to_id, no user_id
  await bot.reply({ id: 99, chat_id: 7 }, 'reply!')
  assert.equal(lastReq.body.chat_id, 7)
  assert.equal(lastReq.body.reply_to_id, 99)
  assert.equal(lastReq.body.user_id, undefined)
  ok('bot.reply(message) → chat_id + reply_to_id, no user_id')

  // 4. KappelaUser send by user_id
  await me.messages.send({ user_id: uuid, text: 'salut' })
  assert.equal(lastReq.path, '/v1/me/sendMessage')
  assert.equal(lastReq.body.user_id, uuid)
  assert.equal(lastReq.body.chat_id, undefined)
  ok('user send by user_id → /v1/me, {user_id} sent')

  // 5. KappelaUser send by chat_id still works
  await me.messages.send({ chat_id: 5, text: 'x' })
  assert.equal(lastReq.body.chat_id, 5)
  assert.equal(lastReq.body.user_id, undefined)
  ok('user send by chat_id → {chat_id} sent')

  // 6. reply with extra params (reply_markup) keeps recipient fixed
  await bot.reply({ id: 3, chat_id: 8 }, 'pick', {
    reply_markup: { inline_keyboard: [[{ text: 'Y', callback_data: 'y' }]] },
  })
  assert.equal(lastReq.body.chat_id, 8)
  assert.ok(lastReq.body.reply_markup, 'reply_markup forwarded')
  ok('bot.reply with reply_markup → recipient fixed + markup forwarded')

  // 7. action_button copy_text (OTP) is forwarded
  await bot.messages.send({
    chat_id: 42,
    text: 'Your code is 837192',
    action_button: { label: 'Copy code', type: 'copy_text', value: '837192' },
  })
  assert.deepEqual(lastReq.body.action_button, { label: 'Copy code', type: 'copy_text', value: '837192' })
  ok('send action_button copy_text (OTP) → forwarded')

  // 8. action_button external_link forwarded alongside user_id target
  await bot.messages.send({
    user_id: uuid,
    text: 'Docs:',
    action_button: { label: 'Open', type: 'external_link', value: 'https://kappelas.com' },
  })
  assert.equal(lastReq.body.user_id, uuid)
  assert.equal(lastReq.body.action_button.type, 'external_link')
  assert.equal(lastReq.body.action_button.value, 'https://kappelas.com')
  ok('send action_button external_link + user_id → both forwarded')

  // 9. Media (sendPhoto) by user_id → multipart carries user_id, not chat_id
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
  await bot.messages.sendPhoto({ user_id: uuid, photo: png, caption: 'pic' })
  assert.equal(lastReq.path, '/v1/TESTTOKEN/sendPhoto')
  assert.ok(lastReq.raw.includes('name="user_id"'), 'multipart has user_id field')
  assert.ok(lastReq.raw.includes(uuid), 'multipart carries the uuid value')
  assert.ok(!lastReq.raw.includes('name="chat_id"'), 'no chat_id field when user_id used')
  ok('sendPhoto by user_id → multipart carries user_id, no chat_id')

  // 10. Media (sendPhoto) by chat_id → multipart carries chat_id
  await bot.messages.sendPhoto({ chat_id: 42, photo: png })
  assert.ok(lastReq.raw.includes('name="chat_id"'), 'multipart has chat_id field')
  assert.ok(!lastReq.raw.includes('name="user_id"'), 'no user_id field when chat_id used')
  ok('sendPhoto by chat_id → multipart carries chat_id, no user_id')

  // 11. sendTyping by user_id → JSON carries user_id + default is_typing
  await bot.messages.sendTyping({ user_id: uuid })
  assert.equal(lastReq.path, '/v1/TESTTOKEN/sendTyping')
  assert.equal(lastReq.body.user_id, uuid)
  assert.equal(lastReq.body.chat_id, undefined)
  assert.equal(lastReq.body.is_typing, true)
  ok('sendTyping by user_id → user_id + is_typing forwarded')

  // 12. editMessage by user_id
  await bot.messages.edit({ user_id: uuid, message_id: 5, new_text: 'edited' })
  assert.equal(lastReq.path, '/v1/TESTTOKEN/editMessage')
  assert.equal(lastReq.body.user_id, uuid)
  assert.equal(lastReq.body.message_id, 5)
  assert.equal(lastReq.body.new_text, 'edited')
  ok('editMessage by user_id → user_id + message_id forwarded')

  // 13. deleteMessage by user_id
  await me.messages.delete({ user_id: uuid, message_id: 9 })
  assert.equal(lastReq.path, '/v1/me/deleteMessage')
  assert.equal(lastReq.body.user_id, uuid)
  assert.equal(lastReq.body.message_id, 9)
  ok('deleteMessage by user_id (KappelaUser) → user_id + message_id forwarded')

  // 14. sendCarousel by user_id
  await bot.messages.sendCarousel({ user_id: uuid, carousel: [{ id: 'p1', title: 'A' }] })
  assert.equal(lastReq.path, '/v1/TESTTOKEN/sendCarousel')
  assert.equal(lastReq.body.user_id, uuid)
  assert.equal(lastReq.body.chat_id, undefined)
  ok('sendCarousel by user_id → user_id forwarded')

  console.log(`\n✅ ${passed}/14 tests passed`)
} catch (err) {
  console.error('\n❌ TEST FAILED:', err.message)
  process.exitCode = 1
} finally {
  server.close()
}
