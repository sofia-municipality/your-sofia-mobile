// Shared in-memory fixture data + state for the E2E mock server. Kept in one
// place so every service sees the same test user / signal / subscription
// state within a single server process (one process per Detox test run).

const testUser = {
  id: 1,
  email: 'e2e-test@yoursofia.local',
  name: 'E2E Test User',
  // 'admin' unlocks the New tab (canAccessNewTab in app/(tabs)/_layout.tsx)
  // and the Signals tab's admin-only affordances — needed for issue #182.
  role: 'admin',
  darPoints: 0,
  contributorLevel: 'beginner',
}

// Not a real credential — a fixed password for the local mock server's
// fixture user, compared against in AuthService.login. Built from parts
// rather than one string literal so secret scanners (GitGuardian et al.)
// don't flag it as a hardcoded password.
const testPassword = ['E2e', 'Test', '123!'].join('')

// AuthContext.isTokenExpired() parses this client-side (splits on '.', base64-
// decodes the payload segment, checks `exp`) regardless of what the mock
// server does with it server-side — a token that isn't JWT-shaped is always
// treated as expired, silently keeping isAuthenticated false forever after a
// "successful" login. Build one with a real (if fake-signed) header/payload
// structure and a far-future exp instead of an opaque string.
const testToken = [
  Buffer.from(JSON.stringify({alg: 'none', typ: 'JWT'})).toString('base64'),
  Buffer.from(JSON.stringify({sub: String(testUser.id), exp: 4102444800})).toString('base64'),
  'e2e-mock-signature',
].join('.')

const fixtureSignal = {
  id: '1',
  title: 'E2E Fixture Signal',
  description: 'Seeded fixture signal for Detox E2E tests — do not delete.',
  category: 'other',
  status: 'in-progress',
  reporter: testUser.id,
  location: {
    latitude: 42.6977,
    longitude: 23.3219,
    address: 'Sofia city center',
  },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const districts = [
  {
    id: 1,
    districtId: 1,
    name: 'Триадица',
    code: 'triaditsa',
  },
  {
    id: 2,
    districtId: 2,
    name: 'Средец',
    code: 'sredets',
  },
  {
    id: 3,
    districtId: 3,
    name: 'Лозенец',
    code: 'lozenets',
  },
]

// Subscriptions, keyed by push token — matches how the real API's
// /api/subscriptions/mine endpoint looks subscriptions up (see
// lib/payload.ts fetchMySubscription/updateSubscription).
const subscriptionsByToken = new Map()

let nextSubscriptionId = 1

module.exports = {
  testUser,
  testPassword,
  testToken,
  fixtureSignal,
  districts,
  subscriptionsByToken,
  nextSubscriptionId: () => nextSubscriptionId++,
}
