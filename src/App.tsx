export default function App() {
  return (
    <>
      <div className="screen-fallback">
        Open this on a larger screen.
      </div>
      <div className="app-shell">
        <header className="app-header" aria-label="Puzzle header" />
        <main className="app-main">
          <aside className="app-tray-region" aria-label="Brick tray" />
          <section className="app-board-region" aria-label="3D board stage" />
          <aside className="app-views-region" aria-label="Orthographic views" />
        </main>
        <footer className="app-footer" aria-label="Toolbar" />
      </div>
    </>
  )
}
