export default function EndPage() {
  return (
    <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
      <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <h1 style={{ color: 'var(--success-color)' }}>Test Completed!</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '1rem' }}>
          Thank you for participating. Your responses have been recorded successfully.
        </p>
        <p style={{ color: 'var(--text-secondary)', marginTop: '2rem' }}>
          You may now close this window.
        </p>
      </div>
    </div>
  );
}
