// Takes the product screenshots in docs/screenshots at iPhone 16 size (393 x 852 points, 3x).
// Runs against the dev server (the seed data comes from the dev-only helpers), so start it first:
//   npm run dev & npm run screenshots
import { chromium, devices } from 'playwright'

const BASE = process.env.SCREENSHOT_URL ?? 'http://localhost:5173/'
const OUT = new URL('../docs/screenshots/', import.meta.url).pathname

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
const context = await browser.newContext({
  ...devices['iPhone 15 Pro'], // same 393 x 852 viewport and 3x scale as the iPhone 16
  viewport: { width: 393, height: 852 },
  deviceScaleFactor: 3,
  colorScheme: 'light',
})
const page = await context.newPage()
page.on('pageerror', (e) => console.error('page error:', e.message))

await page.goto(BASE + '#/growth')
await page.waitForLoadState('networkidle')

// Seed a believable account: habits with a history, a challenge, and trees across two biomes.
await page.evaluate(async () => {
  const repo = await import('/src/persistence/repo.ts')
  const dev = await import('/src/dev/devTools.ts')
  const dates = await import('/src/domain/dates.ts')
  await dev.wipeEverything()
  const habits = [
    ['Morning run', 'body', 1, 'run', 10],
    ['Read for 20 minutes', 'learning', 1, 'session', 8],
    ['Drink water', 'body', 8, 'glasses', 6],
    ['Meditate', 'mind', 1, 'session', 8],
  ]
  const created = []
  for (const [name, category, targetPerDay, unit, rewardNE] of habits)
    created.push(await repo.createHabit({ name, category, schedule: { type: 'daily' }, targetPerDay, unit, rewardNE }))
  const today = dates.todayKey()
  for (let back = 0; back < 12; back++)
    for (const [i, h] of created.entries()) {
      if (back >= 4 && (back + i) % 5 === 0) continue // a few older gaps so it looks real, with a healthy current streak
      if (back === 0 && i === 3) continue // leave one open today
      await repo.setCompletionCount(h, dates.addDays(today, -back), h.targetPerDay)
    }
  await repo.createChallenge({ name: 'Screen Time', mode: 'duration', target: 120, isScreenTime: true })
  await repo.createChallenge({ name: 'No sugary drinks', mode: 'avoidance', target: null, isScreenTime: false })
  // Enough trees in each world to unlock the first four (15, 35 and 60 trees in total; this plants 66) and fill them in
  const planting = [
    ['tundra', ['snowy-pine', 'frost-spruce']],
    ['savannah', ['acacia', 'baobab']],
    ['marsh', ['mangrove', 'bald-cypress']],
    ['woodland', ['oak', 'pine', 'birch', 'maple', 'cherry-blossom', 'willow']],
  ]
  for (const [biome, species] of planting) for (const sp of species) await dev.plantInstantly(sp, biome === 'woodland' ? 5 : 6, 25, biome)
  await dev.addEnergy(60)
  await repo.updatePreferences({ dayNight: 'day', seasons: 'summer' })
})

const shots = [
  ['growth', '#/growth'],
  ['habitat-woodland', '#/habitat', 'woodland'],
  ['habitat-tundra', '#/habitat', 'tundra'],
  ['habitat-savannah', '#/habitat', 'savannah'],
  ['habitat-marsh', '#/habitat', 'marsh'],
  ['collection', '#/collection'],
  ['challenges', '#/challenges'],
  ['insights', '#/insights'],
  ['focus', '#/focus'],
]
for (const [name, hash, biome] of shots) {
  await page.goto(BASE + hash)
  if (biome) await page.evaluate((b) => localStorage.setItem('habitat.selectedBiome', b), biome) // which world the habitat opens on
  await page.reload() // fresh read of the seeded data
  await page.waitForTimeout(biome ? 4000 : 1200)
  await page.screenshot({ path: `${OUT}${name}.png` })
  console.log('saved', name)
}
await browser.close()
