export default function NoticesLoading() {
  return (
    <div>
      <div className="page-header">
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--text" style={{ marginTop: 8, width: "50%" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="glass-card skeleton" style={{ height: 100 }} />
          <div className="glass-card skeleton" style={{ height: 80 }} />
          <div className="glass-card skeleton" style={{ height: 40 }} />
          <div className="glass-card skeleton skeleton--chart" />
        </div>
        <div className="glass-card skeleton" style={{ height: 500 }} />
      </div>
    </div>
  );
}
