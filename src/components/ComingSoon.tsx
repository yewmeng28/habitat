export function ComingSoon({ title, phase, text }: { title: string; phase: string; text: string }) {
  return (
    <section className="page">
      <h1>{title}</h1>
      <div className="card empty">
        <p className="badge">Planned for {phase}</p>
        <p>{text}</p>
        <p className="muted">Nothing here is functional yet. Keep building habits in Growth to earn Nature Energy in the meantime.</p>
      </div>
    </section>
  )
}
