// Shinpo push Worker — VAPID (RFC 8292) + Web Push encryption (RFC 8291 / RFC 8188)
// Pure WebCrypto — no npm packages, compatible with Cloudflare Workers.
//
// Env bindings (wrangler.toml vars + secrets):
//   SHINPO_KV          — KV namespace for the push subscription
//   VAPID_PUBLIC_KEY   — base64url uncompressed P-256 point (65 bytes)
//   VAPID_PRIVATE_KEY  — base64url raw P-256 scalar (32 bytes)  [wrangler secret]
//   VAPID_SUBJECT      — mailto: or https: contact URI

// ── base64url helpers ──────────────────────────────────────────────────────────

function b64uEncode(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function b64uDecode(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), c => c.charCodeAt(0));
}

function concat(...arrays) {
  const len = arrays.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const a of arrays) { out.set(a, off); off += a.length; }
  return out;
}

// ── HMAC-SHA-256 / HKDF (RFC 5869) ───────────────────────────────────────────

async function hmac256(keyBytes, data) {
  const k = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data));
}

// HKDF-Extract(salt, IKM) = HMAC(key=salt, data=IKM)
const hkdfExtract = (salt, ikm) => hmac256(salt, ikm);

// HKDF-Expand(PRK, info, length)
async function hkdfExpand(prk, info, length) {
  const out = [];
  let prev = new Uint8Array(0);
  for (let i = 1; out.length < length; i++) {
    prev = await hmac256(prk, concat(prev, info, new Uint8Array([i])));
    out.push(...prev);
  }
  return new Uint8Array(out.slice(0, length));
}

// ── VAPID JWT (RFC 8292) ──────────────────────────────────────────────────────

async function importVapidSigningKey(privateKeyB64u, publicKeyB64u) {
  const pub = b64uDecode(publicKeyB64u); // 0x04 || x(32) || y(32)
  return crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', d: privateKeyB64u, x: b64uEncode(pub.slice(1, 33)), y: b64uEncode(pub.slice(33)), ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign'],
  );
}

async function buildVapidJwt(endpoint, subject, signingKey) {
  const aud = new URL(endpoint).origin;
  const exp = Math.floor(Date.now() / 1000) + 43200; // 12 h
  const enc = (obj) => b64uEncode(new TextEncoder().encode(JSON.stringify(obj)));
  const unsigned = `${enc({ typ: 'JWT', alg: 'ES256' })}.${enc({ aud, exp, sub: subject })}`;
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signingKey, new TextEncoder().encode(unsigned));
  return `${unsigned}.${b64uEncode(sig)}`;
}

// ── Web Push payload encryption (RFC 8291 + RFC 8188 aes128gcm) ──────────────

async function encryptPushPayload(subscription, plaintext) {
  const receiverPub = b64uDecode(subscription.keys.p256dh); // 65 bytes
  const authSecret  = b64uDecode(subscription.keys.auth);   // 16 bytes

  // Ephemeral ECDH key pair for this message
  const senderKP  = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const senderPub = new Uint8Array(await crypto.subtle.exportKey('raw', senderKP.publicKey)); // 65 bytes

  // Raw ECDH shared secret
  const receiverKey   = await crypto.subtle.importKey('raw', receiverPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const sharedSecret  = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: receiverKey }, senderKP.privateKey, 256));

  // RFC 8291 §3.4 — two-level key derivation
  const prkKey  = await hkdfExtract(authSecret, sharedSecret);
  const infoKey = concat(new TextEncoder().encode('WebPush: info'), new Uint8Array([0]), receiverPub, senderPub);
  const ikm     = await hkdfExpand(prkKey, infoKey, 32);

  // RFC 8188 aes128gcm — content encryption keys
  const salt    = crypto.getRandomValues(new Uint8Array(16));
  const prk     = await hkdfExtract(salt, ikm);
  const cek     = await hkdfExpand(prk, concat(new TextEncoder().encode('Content-Encoding: aes128gcm'), new Uint8Array([0])), 16);
  const nonce   = await hkdfExpand(prk, concat(new TextEncoder().encode('Content-Encoding: nonce'), new Uint8Array([0])), 12);

  // Encrypt plaintext || 0x02 (last-record padding delimiter per RFC 8188 §2)
  const aesKey    = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt']);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce },
    aesKey,
    concat(new TextEncoder().encode(plaintext), new Uint8Array([0x02])),
  ));

  // aes128gcm content coding header: salt(16) + rs(4 BE) + keyid_len(1) + keyid(65)
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);
  return concat(salt, rs, new Uint8Array([senderPub.length]), senderPub, ciphertext);
}

// ── Main send function ────────────────────────────────────────────────────────

async function sendPush(subscription, payloadJson, env) {
  const signingKey = await importVapidSigningKey(env.VAPID_PRIVATE_KEY, env.VAPID_PUBLIC_KEY);
  const jwt  = await buildVapidJwt(subscription.endpoint, env.VAPID_SUBJECT, signingKey);
  const body = await encryptPushPayload(subscription, payloadJson);

  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      'Authorization':     `vapid t=${jwt},k=${env.VAPID_PUBLIC_KEY}`,
      'Content-Encoding':  'aes128gcm',
      'Content-Type':      'application/octet-stream',
      'TTL':               '86400',
    },
    body,
  });

  if (!res.ok) throw new Error(`Push service ${res.status}: ${await res.text()}`);
}

// ── Worker entry ──────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    const path = new URL(request.url).pathname;

    if (path === '/subscribe' && request.method === 'POST') {
      try {
        await env.SHINPO_KV.put('push_subscription', JSON.stringify(await request.json()));
        return new Response('OK', { headers: CORS });
      } catch (e) {
        return new Response(e.message, { status: 500, headers: CORS });
      }
    }

    if (path === '/test-send' && request.method === 'POST') {
      try {
        const raw = await env.SHINPO_KV.get('push_subscription');
        if (!raw) return new Response('No subscription saved yet', { status: 404, headers: CORS });
        await sendPush(JSON.parse(raw), JSON.stringify({ title: 'Shinpo', body: 'Test notification' }), env);
        return new Response('Sent', { headers: CORS });
      } catch (e) {
        return new Response(e.message, { status: 500, headers: CORS });
      }
    }

    return new Response('Not found', { status: 404, headers: CORS });
  },
};
