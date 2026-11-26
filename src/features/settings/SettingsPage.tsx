import { useRef, useState } from 'react'
import { unlockAudio } from '../../audio/soundscape'
import { DEFAULT_DISPLAY, type Display } from '../../domain/preferences'
import { updatePreferences } from '../../persistence/repo'
import { exportBackup, importBackup, parseBackup, type Backup, type ImportSummary } from '../../persistence/backup'

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function Choice<T extends string>({ label, value, options, onChange, hint }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void; hint?: string }) {
  return (
    <label className="setting">
      <span>
        {label}
        {hint && <span className="small muted"> {hint}</span>}
      </span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
      </select>
    </label>
  )
}

function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="setting check-row">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {label}
        {hint && <span className="small muted"> {hint}</span>}
      </span>
    </label>
  )
}

export function SettingsPage({ display }: { display: Display }) {
  // Changes save at once. Turning sound on is a tap, which is also what lets the browser start audio.
  const set = (patch: Partial<Display>) => {
    if (patch.sound || patch.music) unlockAudio()
    void updatePreferences(patch)
  }
  const fileRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Backup | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  async function onExport() {
    try {
      const backup = await exportBackup()
      download(`habitat-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(backup, null, 2))
      setMessage({ kind: 'ok', text: 'Backup downloaded.' })
    } catch {
      setMessage({ kind: 'error', text: 'Could not create the backup.' })
    }
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setMessage(null)
    const result = parseBackup(await file.text())
    if (!result.ok) {
      setPending(null)
      setMessage({ kind: 'error', text: result.error })
    } else setPending(result.backup)
  }

  async function onImport(mode: 'replace' | 'merge') {
    if (!pending) return
    try {
      const s: ImportSummary = await importBackup(pending, mode)
      setMessage({
        kind: 'ok',
        text: mode === 'replace' ? 'Backup restored. Your previous local data was replaced.' : `Merged: ${s.added} added, ${s.updated} updated, ${s.skipped} unchanged.`,
      })
    } catch {
      setMessage({ kind: 'error', text: 'Import failed. Your existing data was not changed.' })
    }
    setPending(null)
  }

  const counts = pending?.data
  return (
    <section className="page">
      <h1>Settings</h1>

      <div className="card">
        <h2>Guest mode</h2>
        <p>You're using Habitat as a guest. Everything is stored privately on this device and works offline. Cloud sync and accounts are planned for a later phase.</p>
      </div>

      <div className="card form">
        <h2>Look and feel</h2>
        <Choice label="Time of day" value={display.dayNight} onChange={(v) => set({ dayNight: v })} hint="Auto follows your clock." options={[['auto', 'Auto'], ['day', 'Always day'], ['night', 'Always night']]} />
        <Choice label="Seasons" value={display.seasons} onChange={(v) => set({ seasons: v })} hint="The woodland changes with the calendar." options={[['auto', 'Auto'], ['off', 'Off'], ['spring', 'Spring'], ['summer', 'Summer'], ['autumn', 'Autumn'], ['winter', 'Winter']]} />
        <Toggle label="Weather and drifting effects" hint="Snow, leaves, mist and glowing lights." checked={display.weather} onChange={(v) => set({ weather: v })} />
        <Choice label="Motion" value={display.motion} onChange={(v) => set({ motion: v })} hint="Reduced stops creatures wandering and effects drifting." options={[['auto', 'Follow my device'], ['reduced', 'Reduced'], ['full', 'Full']]} />
        <Choice label="Quality" value={display.quality} onChange={(v) => set({ quality: v })} hint="Low uses fewer effects, to save battery." options={[['auto', 'Auto'], ['high', 'High'], ['low', 'Low']]} />
        <button className="link" onClick={() => set({ ...DEFAULT_DISPLAY, sound: display.sound, music: display.music, volume: display.volume })}>Reset look and feel</button>
      </div>

      <div className="card form">
        <h2>Sound</h2>
        <p className="muted small">Gentle sounds made on your device, with nothing to download. Off until you turn it on, and heard in the habitat and during a focus session.</p>
        <Toggle label="Ambient sounds" hint="Wind, birds, frogs and chimes, different in each biome." checked={display.sound} onChange={(v) => set({ sound: v })} />
        <Toggle label="Music" hint="Slow, quiet and different every time." checked={display.music} onChange={(v) => set({ music: v })} />
        <label className="setting">
          <span>Volume</span>
          <input type="range" min={0} max={1} step={0.05} value={display.volume} onChange={(e) => set({ volume: Number(e.target.value) })} aria-label="Volume" />
        </label>
      </div>

      <div className="card">
        <h2>Backup</h2>
        <p className="muted">Your data lives only on this device, so export a backup now and then, especially before clearing browser data.</p>
        <div className="row">
          <button className="btn primary" onClick={onExport}>Export JSON</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>Import JSON…</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onPick} />
        </div>

        {pending && counts && (
          <div className="confirm" role="alertdialog" aria-label="Confirm import">
            <p>
              <strong>Backup from {new Date(pending.exportedAt).toLocaleString()}</strong>
              <br />
              {counts.habits.length} habits, {counts.completions.length} completions, {counts.challenges.length} challenges, {counts.challengeRecords.length} challenge entries.
            </p>
            <p><strong>Merge</strong> keeps your current data and adds or updates records from the file (newest wins). <strong>Replace</strong> deletes everything currently on this device first.</p>
            <div className="row">
              <button className="btn primary" onClick={() => onImport('merge')}>Merge</button>
              <button className="btn danger" onClick={() => onImport('replace')}>Replace all local data</button>
              <button className="btn" onClick={() => setPending(null)}>Cancel</button>
            </div>
          </div>
        )}
        {message && <p className={message.kind === 'error' ? 'error' : 'ok'} role="status">{message.text}</p>}
      </div>
    </section>
  )
}
