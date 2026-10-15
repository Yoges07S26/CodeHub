const crypto = require('crypto');
const config = require('../config/app');

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString('utf8');
}

class JWT {
  static encode(payload, secret = config.jwtSecret, expirySeconds = 86400 * 7) {
    const header = { typ: 'JWT', alg: 'HS256' };
    const now = Math.floor(Date.now() / 1000);
    const body = {
      ...payload,
      iat: now,
      exp: now + expirySeconds
    };

    const header64 = base64UrlEncode(JSON.stringify(header));
    const payload64 = base64UrlEncode(JSON.stringify(body));

    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${header64}.${payload64}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return `${header64}.${payload64}.${signature}`;
  }

  static decode(token, secret = config.jwtSecret) {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header64, payload64, signature64] = parts;
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(`${header64}.${payload64}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    if (signature64 !== expectedSig) return null;

    try {
      const payload = JSON.parse(base64UrlDecode(payload64));
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        return null;
      }
      return payload;
    } catch {
      return null;
    }
  }
}

module.exports = JWT;
