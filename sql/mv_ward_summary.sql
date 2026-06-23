CREATE MATERIALIZED VIEW IF NOT EXISTS mv_ward_summary AS
SELECT
    w.id                                                              AS ward_id,
    w.name                                                            AS ward_number,
    u.name                                                            AS ulb_name,
    d.id                                                              AS district_id,
    d.name                                                            AS district_name,
    COUNT(*)                                                          AS total_defaulters,
    SUM(def.total_outstanding)                                        AS total_outstanding,
    ROUND(AVG(def.total_outstanding), 2)                              AS avg_outstanding,
    SUM(CASE WHEN def.risk_level::text = 'CRITICAL' THEN 1 ELSE 0 END)     AS critical_count,
    SUM(CASE WHEN def.risk_level::text = 'HIGH'     THEN 1 ELSE 0 END)     AS high_count,
    SUM(CASE WHEN def.risk_level::text = 'MEDIUM'   THEN 1 ELSE 0 END)     AS medium_count,
    SUM(CASE WHEN def.risk_level::text = 'LOW'      THEN 1 ELSE 0 END)     AS low_count
FROM   defaulters  def
JOIN   wards       w   ON w.id  = def.ward_id
JOIN   ulbs        u   ON u.id  = w.ulb_id
JOIN   districts   d   ON d.id  = def.district_id
GROUP  BY w.id, w.name, u.name, d.id, d.name
WITH DATA;

CREATE UNIQUE INDEX IF NOT EXISTS mv_ward_summary_ward_id_idx
    ON mv_ward_summary (ward_id);


CREATE INDEX IF NOT EXISTS mv_ward_summary_district_id_idx
    ON mv_ward_summary (district_id);

-- eg. SELECT * FROM mv_ward_summary ORDER BY ward_id;
