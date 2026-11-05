// Web Push (RFC 8030 + cifrado RFC 8291 aes128gcm + VAPID RFC 8292) con WebCrypto.
// Sin dependencias: funciona en Cloudflare Workers / Node 20+.

const enc = new TextEncoder()

export const b64uToBytes = (s: string): Uint8Array<ArrayBuffer> => {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "="))
  return Uint8Array.from(b, (c) => c.charCodeAt(0))
}
export const bytesToB64u = (b: Uint8Array) => {
  let s = ""
  for (const x of b) s += String.fromCharCode(x)
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}
const concat = (...a: Uint8Array[]): Uint8Array<ArrayBuffer> => {
  const out = new Uint8Array(a.reduce((n, x) => n + x.length, 0))
  let o = 0
  for (const x of a) { out.set(x, o); o += x.length }
  return out
}

async function hkdf(salt: BufferSource, ikm: BufferSource, info: BufferSource, len: number) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, len * 8))
}

/** Cifra el mensaje para una suscripción (p256dh y auth en base64url). Devuelve el cuerpo de la petición. */
export async function encryptPayload(payload: string, p256dh: string, auth: string) {
  const uaPub = b64uToBytes(p256dh)
  const authSecret = b64uToBytes(auth)
  const eph = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair
  const asPub = new Uint8Array(await crypto.subtle.exportKey("raw", eph.publicKey))
  const uaKey = await crypto.subtle.importKey("raw", uaPub, { name: "ECDH", namedCurve: "P-256" }, false, [])
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, eph.privateKey, 256))

  const prk = await hkdf(authSecret, shared, concat(enc.encode("WebPush: info\0"), uaPub, asPub), 32)
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const cek = await hkdf(salt, prk, enc.encode("Content-Encoding: aes128gcm\0"), 16)
  const nonce = await hkdf(salt, prk, enc.encode("Content-Encoding: nonce\0"), 12)

  const data = concat(enc.encode(payload), new Uint8Array([2])) // delimitador de último registro
  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"])
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, data))
  const header = concat(salt, new Uint8Array([0, 0, 0x10, 0]), new Uint8Array([asPub.length]), asPub) // rs = 4096
  return concat(header, ct)
}

/** Cabecera Authorization de VAPID. publicKey = 65 bytes (base64url), privateKey = 32 bytes (base64url). */
export async function vapidAuthHeader(endpoint: string, subject: string, publicKey: string, privateKey: string, now = Date.now()) {
  const pub = b64uToBytes(publicKey)
  const jwk = { kty: "EC", crv: "P-256", d: privateKey, x: bytesToB64u(pub.slice(1, 33)), y: bytesToB64u(pub.slice(33, 65)) }
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"])
  const aud = new URL(endpoint).origin
  const head = bytesToB64u(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })))
  const body = bytesToB64u(enc.encode(JSON.stringify({ aud, exp: Math.floor(now / 1000) + 12 * 3600, sub: subject })))
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${head}.${body}`)))
  return `vapid t=${head}.${body}.${bytesToB64u(sig)}, k=${publicKey}`
}

export type PushSub = { endpoint: string; p256dh: string; auth: string }
export type PushConfig = { publicKey: string; privateKey: string; subject: string }

/** Envía una notificación. 404/410 = la suscripción ya no existe (hay que borrarla). */
export async function sendPush(sub: PushSub, message: { title: string; body: string; url?: string; tag?: string }, cfg: PushConfig) {
  try {
    const body = await encryptPayload(JSON.stringify(message), sub.p256dh, sub.auth)
    const res = await fetch(sub.endpoint, {
      method: "POST",
      headers: {
        Authorization: await vapidAuthHeader(sub.endpoint, cfg.subject, cfg.publicKey, cfg.privateKey),
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        TTL: "3600",
        Urgency: "normal",
      },
      body,
    })
    return { ok: res.ok, status: res.status, gone: res.status === 404 || res.status === 410 }
  } catch {
    return { ok: false, status: 0, gone: false }
  }
}

/** Genera un par VAPID nuevo (solo se usa en el generador del admin, en el navegador). */
export async function generateVapidKeys() {
  const kp = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign"])) as CryptoKeyPair
  const jwk = await crypto.subtle.exportKey("jwk", kp.privateKey)
  const pub = concat(new Uint8Array([4]), b64uToBytes(jwk.x!), b64uToBytes(jwk.y!))
  return { publicKey: bytesToB64u(pub), privateKey: jwk.d! }
}
