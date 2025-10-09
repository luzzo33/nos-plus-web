-- Apply fills for live rows where xNOS is NULL/0/<30M or APR invalid, using prev/next valid
-- Safety: creates a backup copy and a log of changes. MySQL 5.7-compatible (no CTEs).
SET autocommit = 0;
START TRANSACTION;

-- 1) Backup (create once). Adjust name if you need multiple runs.
CREATE TABLE IF NOT EXISTS nosana_stats.nosana_data_backup_before_fill LIKE nosana_stats.nosana_data;
INSERT INTO nosana_stats.nosana_data_backup_before_fill SELECT * FROM nosana_stats.nosana_data WHERE scrape_time NOT IN (SELECT scrape_time FROM nosana_stats.nosana_data_backup_before_fill);

-- 2) Candidate fills via correlated lookups (prev->next fallback)
DROP TEMPORARY TABLE IF EXISTS tmp_fill_candidates;
CREATE TEMPORARY TABLE tmp_fill_candidates AS
SELECT d.scrape_time,
       d.xNOS AS xNOS_old,
       d.apr_nos AS apr_old,
       CASE WHEN (d.xNOS IS NULL OR d.xNOS = 0 OR d.xNOS < 30000000 OR d.apr_nos IS NULL OR d.apr_nos <= 0 OR d.apr_nos > 100) THEN
            CASE WHEN (SELECT v1.xNOS FROM nosana_stats.nosana_data v1
                       WHERE v1.scrape_time < d.scrape_time AND v1.xNOS >= 30000000 AND v1.apr_nos > 0 AND v1.apr_nos <= 100
                       ORDER BY v1.scrape_time DESC LIMIT 1) IS NOT NULL THEN 'prev'
                 WHEN (SELECT v2.xNOS FROM nosana_stats.nosana_data v2
                       WHERE v2.scrape_time > d.scrape_time AND v2.xNOS >= 30000000 AND v2.apr_nos > 0 AND v2.apr_nos <= 100
                       ORDER BY v2.scrape_time ASC LIMIT 1) IS NOT NULL THEN 'next'
                 ELSE 'none' END
            ELSE 'skip' END AS fill_source,
  CASE WHEN (d.xNOS IS NULL OR d.xNOS = 0 OR d.xNOS < 30000000 OR d.apr_nos IS NULL OR d.apr_nos <= 0 OR d.apr_nos > 100) THEN
            COALESCE((SELECT v1.xNOS FROM nosana_stats.nosana_data v1
                      WHERE v1.scrape_time < d.scrape_time AND v1.xNOS >= 30000000 AND v1.apr_nos > 0 AND v1.apr_nos <= 100
                      ORDER BY v1.scrape_time DESC LIMIT 1),
                     (SELECT v2.xNOS FROM nosana_stats.nosana_data v2
                      WHERE v2.scrape_time > d.scrape_time AND v2.xNOS >= 30000000 AND v2.apr_nos > 0 AND v2.apr_nos <= 100
                      ORDER BY v2.scrape_time ASC LIMIT 1),
                     d.xNOS)
            ELSE d.xNOS END AS xNOS_new,
  CASE WHEN (d.apr_nos IS NULL OR d.apr_nos <= 0 OR d.apr_nos > 100 OR d.xNOS IS NULL OR d.xNOS = 0 OR d.xNOS < 30000000) THEN
            COALESCE((SELECT v1.apr_nos FROM nosana_stats.nosana_data v1
                      WHERE v1.scrape_time < d.scrape_time AND v1.xNOS >= 30000000 AND v1.apr_nos > 0 AND v1.apr_nos <= 100
                      ORDER BY v1.scrape_time DESC LIMIT 1),
                     (SELECT v2.apr_nos FROM nosana_stats.nosana_data v2
                      WHERE v2.scrape_time > d.scrape_time AND v2.xNOS >= 30000000 AND v2.apr_nos > 0 AND v2.apr_nos <= 100
                      ORDER BY v2.scrape_time ASC LIMIT 1),
                     d.apr_nos)
            ELSE d.apr_nos END AS apr_new,
       COALESCE((SELECT v1.scrape_time FROM nosana_stats.nosana_data v1
                 WHERE v1.scrape_time < d.scrape_time AND v1.xNOS >= 30000000 AND v1.apr_nos > 0 AND v1.apr_nos <= 100
                 ORDER BY v1.scrape_time DESC LIMIT 1),
                (SELECT v2.scrape_time FROM nosana_stats.nosana_data v2
                 WHERE v2.scrape_time > d.scrape_time AND v2.xNOS >= 30000000 AND v2.apr_nos > 0 AND v2.apr_nos <= 100
                 ORDER BY v2.scrape_time ASC LIMIT 1),
                NULL) AS ref_time
FROM nosana_stats.nosana_data d
WHERE (d.xNOS IS NULL OR d.xNOS = 0 OR d.xNOS < 30000000 OR d.apr_nos IS NULL OR d.apr_nos <= 0 OR d.apr_nos > 100);

-- 3) Log table
CREATE TABLE IF NOT EXISTS nosana_stats.nosana_data_fill_log (
  scrape_time DATETIME PRIMARY KEY,
  xNOS_old BIGINT NULL,
  apr_old DECIMAL(10,2) NULL,
  xNOS_new BIGINT NULL,
  apr_new DECIMAL(10,2) NULL,
  fill_source ENUM('prev','next','none','skip') NOT NULL,
  ref_time DATETIME NULL,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 4) Insert into log the rows we will actually change
INSERT INTO nosana_stats.nosana_data_fill_log (scrape_time, xNOS_old, apr_old, xNOS_new, apr_new, fill_source, ref_time)
SELECT f.scrape_time, f.xNOS_old, f.apr_old, f.xNOS_new, f.apr_new, f.fill_source, f.ref_time
FROM tmp_fill_candidates f
WHERE f.fill_source IN ('prev','next')
  AND (f.xNOS_new IS NOT NULL AND f.xNOS_new <> f.xNOS_old OR f.apr_new IS NOT NULL AND f.apr_new <> f.apr_old)
ON DUPLICATE KEY UPDATE
  xNOS_old = VALUES(xNOS_old), apr_old = VALUES(apr_old),
  xNOS_new = VALUES(xNOS_new), apr_new = VALUES(apr_new),
  fill_source = VALUES(fill_source), ref_time = VALUES(ref_time), applied_at = CURRENT_TIMESTAMP;

-- 5) Apply updates
UPDATE nosana_stats.nosana_data d
JOIN tmp_fill_candidates f USING (scrape_time)
SET d.xNOS = f.xNOS_new,
    d.apr_nos = f.apr_new
WHERE f.fill_source IN ('prev','next')
  AND (f.xNOS_new IS NOT NULL AND f.xNOS_new <> d.xNOS OR f.apr_new IS NOT NULL AND f.apr_new <> d.apr_nos);

COMMIT;
SET autocommit = 1;
