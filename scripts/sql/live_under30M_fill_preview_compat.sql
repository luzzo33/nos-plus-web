-- MySQL 5.7-compatible preview: no CTEs, uses correlated subqueries only
SELECT DATE_FORMAT(d.scrape_time, '%Y-%m-%d %H:%i:%s') AS scrape_time,
       COALESCE(d.xNOS, 0) AS xNOS_old,
       COALESCE(d.apr_nos, 0) AS apr_old,
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
                     COALESCE(d.xNOS, 0))
            ELSE COALESCE(d.xNOS, 0) END AS xNOS_new,
       CASE WHEN (d.apr_nos IS NULL OR d.apr_nos <= 0 OR d.apr_nos > 100 OR d.xNOS IS NULL OR d.xNOS = 0 OR d.xNOS < 30000000) THEN
            COALESCE((SELECT v1.apr_nos FROM nosana_stats.nosana_data v1
                      WHERE v1.scrape_time < d.scrape_time AND v1.xNOS >= 30000000 AND v1.apr_nos > 0 AND v1.apr_nos <= 100
                      ORDER BY v1.scrape_time DESC LIMIT 1),
                     (SELECT v2.apr_nos FROM nosana_stats.nosana_data v2
                      WHERE v2.scrape_time > d.scrape_time AND v2.xNOS >= 30000000 AND v2.apr_nos > 0 AND v2.apr_nos <= 100
                      ORDER BY v2.scrape_time ASC LIMIT 1),
                     COALESCE(d.apr_nos, 0))
            ELSE COALESCE(d.apr_nos, 0) END AS apr_new,
       COALESCE((SELECT DATE_FORMAT(v1.scrape_time, '%Y-%m-%d %H:%i:%s') FROM nosana_stats.nosana_data v1
                 WHERE v1.scrape_time < d.scrape_time AND v1.xNOS >= 30000000 AND v1.apr_nos > 0 AND v1.apr_nos <= 100
                 ORDER BY v1.scrape_time DESC LIMIT 1),
                (SELECT DATE_FORMAT(v2.scrape_time, '%Y-%m-%d %H:%i:%s') FROM nosana_stats.nosana_data v2
                 WHERE v2.scrape_time > d.scrape_time AND v2.xNOS >= 30000000 AND v2.apr_nos > 0 AND v2.apr_nos <= 100
                 ORDER BY v2.scrape_time ASC LIMIT 1),
                '') AS ref_time
FROM nosana_stats.nosana_data d
WHERE (d.xNOS IS NULL OR d.xNOS = 0 OR d.xNOS < 30000000 OR d.apr_nos IS NULL OR d.apr_nos <= 0 OR d.apr_nos > 100)
ORDER BY d.scrape_time;
