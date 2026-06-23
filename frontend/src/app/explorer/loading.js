export default function ExplorerLoading() {
  return (
    <div>
      <div className="page-header">
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--text" style={{ marginTop: 8, width: "55%" }} />
      </div>
      <div className="glass-card skeleton" style={{ height: 80, marginBottom: 16 }} />
      <div className="glass-card skeleton" style={{ height: 400 }} />
      <div className="grid-2" style={{ marginTop: 32 }}>
        <div className="glass-card skeleton skeleton--chart" />
        <div className="glass-card skeleton skeleton--chart" />
      </div>
    </div>
  );
}
