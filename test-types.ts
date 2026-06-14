// Compile-time tests for the SendTarget union on SendMessageParams.
// Run: npx tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext \
//        --lib ES2022,DOM --skipLibCheck test-types.ts
// Each @ts-expect-error MUST trigger an error, otherwise tsc fails (unused directive).
import type { SendMessageParams } from './dist/index.js'

// ── valid forms ──────────────────────────────────────────────────────────────
const a: SendMessageParams = { chat_id: 1, text: 'x' }
const b: SendMessageParams = { user_id: '00000000-0000-4000-8000-000000000000', text: 'x' }
const c: SendMessageParams = { chat_id: 1, text: 'x', reply_to_id: 9, delete_previous: true }

// ── invalid forms (must be rejected by the type system) ──────────────────────
// @ts-expect-error — cannot provide BOTH chat_id and user_id
const d: SendMessageParams = { chat_id: 1, user_id: 'uuid', text: 'x' }
// @ts-expect-error — must provide a recipient (chat_id or user_id)
const e: SendMessageParams = { text: 'x' }
// @ts-expect-error — text is required
const f: SendMessageParams = { chat_id: 1 }

void a; void b; void c; void d; void e; void f
