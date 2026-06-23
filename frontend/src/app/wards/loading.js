export default function WardsLoading() {
  return (
    <div>
      <div className="page-header">
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--text" style={{ marginTop: 8, width: "45%" }} />
      </div>
      <div className="skeleton" style={{ height: 40, width: 300, marginBottom: 24, borderRadius: 12 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 24 }}>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="glass-card skeleton skeleton--card" />
        ))}
      </div>
    </div>
  );
}
