export default function Loading() {
  return (
    <div>
      <div className="page-header">
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--text" style={{ marginTop: 8, width: "40%" }} />
      </div>
      <div className="grid-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card skeleton skeleton--card" />
        ))}
      </div>
      <div className="grid-2" style={{ marginTop: 32 }}>
        <div className="glass-card skeleton skeleton--chart" />
        <div className="glass-card skeleton skeleton--chart" />
      </div>
    </div>
  );
}
