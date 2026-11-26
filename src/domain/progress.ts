import { BIOMES } from '../data/biomes'
import { ACHIEVEMENTS, DISCOVERY_POINTS, RARE_DISCOVERIES, WILDLIFE } from '../data/collection'
import { SPECIES } from '../data/species'
import { countsFor, currentStreak, isScheduledOn } from './habits'
import type { DateKey, Discovery, DiscoveryKind, FocusSession, Habit, HabitCompletion, PlantedTree, Rule } from './types'

export interface Stats {
  sessions: number
  hours: number
  trees: number
  treesBySpecies: Record<string, number>
  treesByBiome: Record<string, number>
  maxAreaTrees: number
  speciesUnlocked: number
  bestHabitStreak: number
}

export interface StatsInput {
  sessions: FocusSession[]
  trees: PlantedTree[]
  habits: Habit[]
  completions: HabitCompletion[]
  today: DateKey
  weekStartsOn?: 0 | 1
}

export function computeStats(i: StatsInput): Stats {
  const done = i.sessions.filter((s) => s.status === 'completed')
  const treesBySpecies: Record<string, number> = {}
  const treesByBiome: Record<string, number> = {}
  const perArea = new Map<string, number>()
  for (const t of i.trees) {
    treesBySpecies[t.speciesId] = (treesBySpecies[t.speciesId] ?? 0) + 1
    treesByBiome[t.biomeId] = (treesByBiome[t.biomeId] ?? 0) + 1
    perArea.set(t.areaId, (perArea.get(t.areaId) ?? 0) + 1)
  }
  let bestHabitStreak = 0
  for (const h of i.habits) {
    if (h.archivedAt || !isScheduledOn(h, i.today)) continue
    bestHabitStreak = Math.max(bestHabitStreak, currentStreak(h, countsFor(h.id, i.completions), i.today, i.weekStartsOn ?? 1))
  }
  const base: Stats = {
    sessions: done.length,
    hours: done.reduce((s, x) => s + x.plannedSeconds, 0) / 3600,
    trees: i.trees.length,
    treesBySpecies,
    treesByBiome,
    maxAreaTrees: Math.max(0, ...perArea.values()),
    speciesUnlocked: 0,
    bestHabitStreak,
  }
  // species-discovered depends on the other stats, so evaluate species rules without it first
  base.speciesUnlocked = SPECIES.filter((s) => ruleProgress(s.unlock, base).met).length
  return base
}

export interface RuleProgress {
  met: boolean
  current: number
  target: number
}

export function ruleProgress(rule: Rule, st: Stats): RuleProgress {
  const mk = (current: number, target: number): RuleProgress => ({ met: current >= target, current: Math.min(current, target), target })
  switch (rule.type) {
    case 'always': return { met: true, current: 1, target: 1 }
    case 'sessions': return mk(st.sessions, rule.n)
    case 'hours': return mk(st.hours, rule.n)
    case 'trees': return mk(st.trees, rule.n)
    case 'species-trees': return mk(st.treesBySpecies[rule.speciesId] ?? 0, rule.n)
    case 'biome-trees': return mk(st.treesByBiome[rule.biomeId] ?? 0, rule.n)
    case 'area-trees': return mk(st.maxAreaTrees, rule.n)
    case 'species-discovered': return mk(st.speciesUnlocked, rule.n)
    case 'habit-streak': return mk(st.bestHabitStreak, rule.n)
    case 'all': {
      // Progress adds up every part, so a combination shows one bar that fills as each piece is grown.
      const parts = rule.rules.map((r) => ruleProgress(r, st))
      return { met: parts.every((p) => p.met), current: parts.reduce((a, p) => a + p.current, 0), target: parts.reduce((a, p) => a + p.target, 0) }
    }
  }
}

const speciesName = (id: string) => SPECIES.find((s) => s.id === id)?.name ?? id

/** Plain-language requirement, e.g. "Plant 3 Birch trees". */
export function requirementText(rule: Rule): string {
  switch (rule.type) {
    case 'always': return 'Available from the start'
    case 'sessions': return `Complete ${rule.n} focus session${rule.n === 1 ? '' : 's'}`
    case 'hours': return `Focus for ${rule.n} hour${rule.n === 1 ? '' : 's'} in total`
    case 'trees': return `Plant ${rule.n} tree${rule.n === 1 ? '' : 's'}`
    case 'species-trees': return `Plant ${rule.n} ${speciesName(rule.speciesId)} trees`
    case 'biome-trees': return `Plant ${rule.n} tree${rule.n === 1 ? '' : 's'} in the ${BIOMES.find((b) => b.id === rule.biomeId)?.name ?? rule.biomeId}`
    case 'area-trees': return `Grow ${rule.n} trees in one area`
    case 'species-discovered': return `Unlock ${rule.n} tree species`
    case 'habit-streak': return `Reach a ${rule.n}-day habit streak`
    case 'all': return rule.rules.map(requirementText).join(', and ')
  }
}

export const isSpeciesUnlockedBy = (speciesId: string, st: Stats): boolean => {
  const s = SPECIES.find((x) => x.id === speciesId)
  return !!s && ruleProgress(s.unlock, st).met
}

export interface Candidate {
  kind: DiscoveryKind
  itemId: string
  points: number
}

/** Everything currently earned that has not been recorded yet. Pure, so it is easy to test. */
export function pendingDiscoveries(st: Stats, existing: Pick<Discovery, 'kind' | 'itemId'>[]): Candidate[] {
  const have = new Set(existing.map((d) => `${d.kind}:${d.itemId}`))
  const out: Candidate[] = []
  const consider = (kind: DiscoveryKind, itemId: string, rule: Rule) => {
    if (!have.has(`${kind}:${itemId}`) && ruleProgress(rule, st).met) out.push({ kind, itemId, points: DISCOVERY_POINTS[kind] })
  }
  for (const s of SPECIES) consider('species', s.id, s.unlock)
  for (const w of WILDLIFE) consider('wildlife', w.id, w.unlock)
  for (const a of ACHIEVEMENTS) consider('achievement', a.id, a.unlock)
  for (const r of RARE_DISCOVERIES) consider('rare', r.id, r.unlock)
  for (const b of BIOMES) consider('biome', b.id, b.unlockTrees === 0 ? { type: 'always' } : { type: 'trees', n: b.unlockTrees })
  return out
}

export interface Summary {
  discoveryPoints: number
  biodiversity: number // species + wildlife discovered. An achievement indicator, never a penalty.
}

export function summarise(discoveries: Pick<Discovery, 'kind' | 'points'>[]): Summary {
  return {
    discoveryPoints: discoveries.reduce((s, d) => s + d.points, 0),
    biodiversity: discoveries.filter((d) => d.kind === 'species' || d.kind === 'wildlife').length,
  }
}
