# The Internet Ship

The ship app: redeem a boarding code, pick a username, and walk around a 2D
pixel-art ship. See `../docs/BRIEF.md` and `../docs/PLAN.md`.

**Status: Milestone 3 (OpenReply).** Instagram comments reach the ship through
our OpenReply fork (`../openreply`, see `lib/ship/README.md` there). Going live
with a real Meta app is Milestone 4.

## Stack

| Package | Version | Notes |
| --- | --- | --- |
| Next.js | 16.4.6 | App Router, Turbopack, `cacheComponents` (create-next-app default) |
| React | 19.3 | |
| Phaser | 4.2.1 | Loaded client-side only via `import()` in `GameCanvas` |
| Tailwind CSS | 4.3 | |
| Vitest | 5.1 | Unit tests in `src/**/*.test.ts` |
| Node.js | 24 | Runs the asset script directly (built-in TypeScript type stripping) |

Phaser 4 over Phaser 3: 4.x has been the stable line since April 2026, while
3.x hasn't had a release since 3.90 (May 2025). The APIs this game uses
(tilemaps, Arcade Physics, sprites, bitmap text) work the same way.

## Commands

```bash
npm install
npm run secrets:generate   # once: adds CODE_PEPPER / CODE_ENCRYPTION_KEY to .env.local
npm run db:check           # checks SUPABASE_URL / SUPABASE_SECRET_KEY
npm run invite:mint -- --count 3   # mint test boarding codes (prints them)
npm run dev            # http://localhost:3000 → Board the ship
npm test               # unit tests + database tests (against .env.local, on throwaway ships)
npm run lint
npm run typecheck
npm run build:assets   # regenerate placeholder art, ship.json and walkable.json
npm run build && npm run start:lan   # production build, reachable from your phone
```

Add `?debug` to the URL (`/ship?debug`) to show FPS and position.

## Deployment (Vercel)

- **Production:** https://internet-ship.vercel.app. The Vercel project is
  `internet-ship` (account `rnaprimer`).
- **Region:** functions run in `bom1` (Mumbai, set in `vercel.json`), next to
  the Supabase database in `ap-south-1`.
- **Production env vars:** `SUPABASE_URL`, plus `SUPABASE_SECRET_KEY`,
  `CODE_PEPPER`, `CODE_ENCRYPTION_KEY` and `SHIP_INTERNAL_SECRET` stored as
  sensitive, plus `SHIP_PUBLIC_URL=https://internet-ship.vercel.app`. To
  change one, run `npx vercel env add NAME production`, then redeploy.
- **To deploy:** `npx vercel deploy --prod` (or push to `main` once the Git
  integration is connected).
- **Testing on a phone:** open https://internet-ship.vercel.app on any network.
  Over HTTPS the session cookie is `Secure` with the `__Host-` prefix.

## Testing on a phone (local build)

1. Put the phone on the same Wi-Fi as this computer.
2. Run `npm run build && npm run start:lan`.
3. Find this computer's LAN address. On macOS, run `ipconfig getifaddr en0`.
4. On the phone, open `http://<that-address>:3000/ship`. Add `?debug` to see FPS.

Use the production build for phone testing. The dev server is slower, and
Next.js blocks dev assets requested from other origins unless you set
`allowedDevOrigins`.

## Boarding (Milestone 2)

```
/board            code entry   → POST /api/boarding/validate  (never consumes)
/board/username   name + look  → POST /api/boarding/redeem    (redeem_invite, one transaction)
/ship             GET /api/me (401 → /board), GET /api/ship/passengers,
                  POST /api/me/position (every 15 s if moved, sendBeacon on pagehide)
                  POST /api/logout
```

- **Database:** `supabase/migrations/*_boarding_schema.sql` holds the tables
  from PLAN §C plus the functions `check_invite`, `redeem_invite`,
  `issue_invite`, `touch_session`, `revoke_session`, `save_position`,
  `rate_limit_hit`, `rate_limit_count`, `sample_passengers` and
  `passenger_count`. RLS is on with no policies. `anon` and `authenticated`
  have no grants. Only the server's secret key can read tables or call
  functions.
- **Codes:** 16 Crockford base32 symbols (80 bits). The database stores
  HMAC-SHA256(`CODE_PEPPER`, code) plus an AES-GCM copy, kept only until the
  code is redeemed or expires. Codes are never logged.
- **Sessions:** 32 random bytes in an HttpOnly, SameSite=Lax cookie (Secure
  with the `__Host-` prefix over HTTPS). The database stores the SHA-256 only.
  Sessions last 30 days with daily rolling renewal. Every POST checks Origin.
- **Positions:** the server checks map version, walkability (the same
  `walkable.json` the game uses), at most one save per second, and a speed
  limit of 1.25 × walking speed × elapsed time + 48 px. The player always
  comes from the session, never the request body.
- **Rate limits:** each hashed IP gets 60 boarding requests and 10 wrong codes
  per 10 minutes. A ship-wide breaker trips at 1,000 wrong codes per 10
  minutes.
- **Code in transit:** the typed code is held in React memory between the two
  boarding pages. It's never written to storage or the URL.

## Returning players (owner decision 2026-11-23)

A code creates at most one player. After that, the same code is that
player's sign-in key: entering it on `/board` calls `POST /api/boarding/resume`
(the `resume_with_code` database function), which starts a new session for
the existing character on any device. It never creates a player, works while
boarding is paused, refuses disabled players, and shares the boarding rate
limits (wrong codes count as failures). Only the code's HMAC is stored.

## OpenReply integration (Milestone 3)

```
OpenReply worker ── POST /internal/invites/issue ──────────▶ issue_invite()
                 ◀── {status, invitation_id, boarding_code, ship_url}
                 ── POST /internal/invites/delivery-status ▶ record_invite_delivery()
```

- **Authentication:** HMAC-SHA256 with `SHIP_INTERNAL_SECRET` over
  `timestamp.body`, sent as `X-Ship-Timestamp` and `X-Ship-Signature`. The ship
  rejects clock skew over 5 minutes and verifies in constant time. The contract
  is `src/lib/internal/contract.ts`, copied verbatim to
  `openreply/lib/ship/contract.ts`.
- **Issue outcomes:**
  - `issued`: a new code.
  - `existing`: the same comment was retried, so the same code comes back.
  - `active_elsewhere`: the person's unused code from another comment, re-sent.
  - `already_boarded`, `paused` or `comment_used`: nothing to send.
- **Re-sending:** the plaintext is only ever in the response. For a re-send,
  the ship decrypts its AES-GCM copy, which is deleted once the code is
  redeemed or expires.
- **Delivery status** never downgrades: delivered > unconfirmed > failed.

## Milestone 5: landing page, admin panel, art

- **Landing page (`/`):** the ship is rendered to `public/game/ship-hero.png` by
  `npm run build:assets` and bobs over the animated ocean. On phones it pans
  instead of shrinking. The live passenger count comes from `GET /api/ship`,
  cached at the CDN for 30 s.
- **Admin panel (`/admin`, `/admin/players`, `/admin/invites`):** served at
  `admin.peekatribe.online` behind Cloudflare Access.
  - `src/proxy.ts` and every page and server action verify the
    `Cf-Access-Jwt-Assertion` token: RS256 against the team's keys, plus
    issuer, AUD, expiry and an `ADMIN_EMAILS` allowlist.
  - Anything else gets a 404, and the panel stays closed until all three
    `CF_ACCESS_*` / `ADMIN_EMAILS` settings are set.
  - Admin identity is separate from player sessions.
  - Actions: pause or resume boarding, revoke unused invitations,
    disable/re-enable players. Disabling signs the player out at once and
    hides them.
  - Every action goes to `admin_audit`.
  - No Instagram identifiers are ever shown.
- **Art:** the tileset and characters are generated by `scripts/art/*`, at the
  same sizes and sheet layout as before.

## Art

The ship's places are painted in code (`scripts/paint/`, `scripts/maps/`) and cut into tiles by
`npm run build:assets`. Hand-drawn props and animations (barrels, kegs, torches, the parrot, flames)
are authored in `art/props.px.js` with the pxl pixel-art tool (installed as a Claude Code skill), and the built
PNGs are committed, so building the game doesn't need pxl. To change them:

```bash
node ~/.claude/skills/pxl-pixel-art/bin/pxl.js build art/props.px.js --out art/out
node scripts/sync-sprites.ts
npm run build:assets
```

## Sea skills (owner decision 2026-11-27)

Activities earn XP in Gunnery, Navigation, Brewing and Seamanship (one XP per thing used, at most
every 12 s). Levels 2–5 unlock upgraded activities; level 5 gives an ability (spyglass, bubble
trail, parrot). Progress is saved in the browser only (`localStorage`, per passenger), validated
with Zod when read, and never sent to the server.

## How it fits together

```
src/app/ship/page.tsx            static page, renders <ShipExperience/>
src/components/
  ShipExperience.tsx             loads /api/me + passengers, shared GameBus
  boarding/                      BoardingForm, UsernameForm, CharacterPicker
  GameCanvas.tsx                 'use client'; import("@/game/createGame") inside useEffect
  VirtualJoystick.tsx            floating touch joystick (touch/pen only)
  PlayerHUD.tsx                  welcome toast, area name, key hint, ?debug stats
src/game/
  createGame.ts                  Phaser config: pixelArt, RESIZE scale, Arcade (variable step)
  events.ts                      typed emitter between React and Phaser (no Phaser import)
  scenes/                        Boot → Preload (assets, anims) → Ship
  entities/                      Player (Arcade sprite, feet hitbox), AmbientPassenger, NameLabel
  systems/                       pure, unit-tested logic (no Phaser):
    walkability.ts               grid queries, foot-box check, BFS paths, areas
    movement.ts                  normalized velocity, facing, frame-rate-independent stepping
    zoom.ts                      integer zoom: 3× touch, 4× desktop
  maps/walkable.json             generated; will be shared with server-side validation in M2
scripts/
  ship-layout.ts                 the ship's layout (edit this, then run build:assets)
  build-ship-assets.ts           writes public/game/* and src/game/maps/walkable.json
  art/                           procedural placeholder art (tiles, characters, font)
public/game/                     generated: ship.json (Tiled format), PNGs, bitmap font
```

**Map.** 48×28 tiles of 16 px, exported in Tiled JSON format, so you can open
`public/game/ship.json` in Tiled. There are four tile layers: `deck`,
`decor-below`, `decor-above` (drawn over characters) and `collision`
(invisible). There are also two object layers: `areas` and `spawn`. The ocean
is an animated TileSprite behind everything, with foam along the waterline.
`walkable.json` is derived from the same layout, and a unit test checks that
it matches the Tiled collision layer.

**Six areas:** Boarding area (gangway and pier, where you spawn), Main deck,
Captain's bridge, Observation deck (bow), Lounge, and Cabin entrance.

**Art.** It's placeholder art, generated by code. Milestone 5 replaces the
PNGs in `public/game/`. Keep 16×16 tiles and 16×24 character frames with the
same sheet layout: 6 frames per row (idle ×2, walk ×4); rows down/left/right/up
for each of 6 variants.

## Environment variables

See `.env.example`: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `CODE_PEPPER`,
`CODE_ENCRYPTION_KEY`, an optional `SHIP_ID`, and `SUPABASE_PUBLISHABLE_KEY`
(tests only). Real values go in `.env.local`, which is never committed.
