-- Preview fill candidates for live rows where xNOS is NULL/0/<30M or APR invalid
-- Outputs: scrape_time, xNOS_old, apr_old, fill_source, xNOS_new, apr_new, ref_time
WITH valid_live AS (
  SELECT scrape_time, xNOS, apr_nos
  FROM nosana_stats.nosana_data
  WHERE xNOS IS NOT NULL AND xNOS >= 30000000 AND apr_nos > 0 AND apr_nos <= 100
),
raw AS (
  SELECT scrape_time, xNOS, apr_nos,
         CASE WHEN xNOS IS NULL OR xNOS = 0 OR xNOS < 30000000 OR apr_nos <= 0 OR apr_nos > 100 THEN 1 ELSE 0 END AS is_bad
  FROM nosana_stats.nosana_data
),
prev_valid AS (
  SELECT r.scrape_time,
         (SELECT v.xNOS FROM valid_live v WHERE v.scrape_time < r.scrape_time ORDER BY v.scrape_time DESC LIMIT 1) AS x_prev,
         (SELECT v.apr_nos FROM valid_live v WHERE v.scrape_time < r.scrape_time ORDER BY v.scrape_time DESC LIMIT 1) AS apr_prev,
         (SELECT v.scrape_time FROM valid_live v WHERE v.scrape_time < r.scrape_time ORDER BY v.scrape_time DESC LIMIT 1) AS t_prev
  FROM raw r
),
next_valid AS (
  SELECT r.scrape_time,
         (SELECT v.xNOS FROM valid_live v WHERE v.scrape_time > r.scrape_time ORDER BY v.scrape_time ASC LIMIT 1) AS x_next,
         (SELECT v.apr_nos FROM valid_live v WHERE v.scrape_time > r.scrape_time ORDER BY v.scrape_time ASC LIMIT 1) AS apr_next,
         (SELECT v.scrape_time FROM valid_live v WHERE v.scrape_time > r.scrape_time ORDER BY v.scrape_time ASC LIMIT 1) AS t_next
  FROM raw r
)
SELECT DATE_FORMAT(r.scrape_time, '%Y-%m-%d %H:%i:%s') AS scrape_time,
       COALESCE(r.xNOS, 0) AS xNOS_old,
       COALESCE(r.apr_nos, 0) AS apr_old,
       CASE WHEN r.is_bad = 0 THEN 'skip'
            WHEN pv.x_prev IS NOT NULL THEN 'prev'
            WHEN nv.x_next IS NOT NULL THEN 'next'
            ELSE 'none' END AS fill_source,
       CASE WHEN r.is_bad = 0 THEN COALESCE(r.xNOS, 0)
            WHEN pv.x_prev IS NOT NULL THEN pv.x_prev
            WHEN nv.x_next IS NOT NULL THEN nv.x_next
            ELSE COALESCE(r.xNOS, 0) END AS xNOS_new,
       CASE WHEN r.is_bad = 0 THEN COALESCE(r.apr_nos, 0)
            WHEN pv.apr_prev IS NOT NULL THEN pv.apr_prev
            WHEN nv.apr_next IS NOT NULL THEN nv.apr_next
            ELSE COALESCE(r.apr_nos, 0) END AS apr_new,
       COALESCE(DATE_FORMAT(pv.t_prev, '%Y-%m-%d %H:%i:%s'), DATE_FORMAT(nv.t_next, '%Y-%m-%d %H:%i:%s'), '') AS ref_time
FROM raw r
JOIN prev_valid pv USING (scrape_time)
JOIN next_valid nv USING (scrape_time)
WHERE r.is_bad = 1
ORDER BY r.scrape_time;
