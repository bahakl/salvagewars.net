// Handles the two form endpoints. Everything else is served from /public.
// Needs a D1 database bound as DB (see README.md). Without it, the forms
// answer "not open yet" and the rest of the site still works.

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CATEGORIES = new Set(['bug', 'idea', 'balance', 'other']);

function reply(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function clean(value, max) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, max) : '';
}

function cleanMultiline(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

async function readJson(request) {
  const text = await request.text();
  if (text.length > 10000) return null;
  try { return JSON.parse(text); } catch { return null; }
}

async function signup(data, env) {
  const nickname = clean(data.nickname, 40);
  const email = clean(data.email, 120).toLowerCase();
  const device = clean(data.device, 60);

  if (!nickname) return reply({ error: 'Enter a nickname.' }, 400);
  if (!EMAIL.test(email)) return reply({ error: 'Enter a valid email address.' }, 400);
  if (data.consent !== true) return reply({ error: 'Tick the box to agree to the privacy policy.' }, 400);

  try {
    await env.DB.prepare(
      'INSERT INTO signups (created_at, nickname, email, device) VALUES (?, ?, ?, ?)'
    ).bind(new Date().toISOString(), nickname, email, device || null).run();
  } catch (err) {
    if (String(err).includes('UNIQUE')) {
      return reply({ message: "You're already on the list. We'll email you when the test opens." });
    }
    throw err;
  }
  return reply({ message: "You're on the list. We'll email you when the test opens." });
}

async function feedback(data, env) {
  const category = CATEGORIES.has(data.category) ? data.category : 'other';
  const message = cleanMultiline(data.message, 2000);
  const build = clean(data.build, 40);
  const contact = clean(data.contact, 120).toLowerCase();

  if (message.length < 5) return reply({ error: 'Write a few words about what you want to tell us.' }, 400);
  if (contact && !EMAIL.test(contact)) return reply({ error: 'That reply email address is not valid. Fix it or leave it empty.' }, 400);
  if (data.consent !== true) return reply({ error: 'Tick the box to agree to the privacy policy.' }, 400);

  await env.DB.prepare(
    'INSERT INTO feedback (created_at, category, message, build, contact) VALUES (?, ?, ?, ?, ?)'
  ).bind(new Date().toISOString(), category, message, build || null, contact || null).run();

  return reply({ message: 'Sent. Thank you, we read every message.' });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/signup' || pathname === '/api/feedback') {
      if (request.method !== 'POST') return reply({ error: 'Use POST.' }, 405);

      const data = await readJson(request);
      if (!data || typeof data !== 'object') return reply({ error: 'The form data was not valid. Reload the page and try again.' }, 400);

      // Hidden field that only bots fill in: pretend it worked.
      if (data.website) return reply({ message: 'Sent. Thank you.' });

      if (!env.DB) return reply({ error: "This form isn't open yet. Try again soon." }, 503);

      try {
        return pathname === '/api/signup' ? await signup(data, env) : await feedback(data, env);
      } catch (err) {
        console.error(err);
        return reply({ error: 'Something went wrong on our side. Try again in a minute.' }, 500);
      }
    }

    return env.ASSETS.fetch(request);
  }
};
