INSERT INTO `pireps` (
  `id`, `flight_number`, `date`, `departure_icao`, `arrival_icao`,
  `flight_time`, `cargo`, `fuel_burned`, `multiplier_id`, `aircraft_id`,
  `comments`, `denied_reason`, `user_id`, `status`, `category`,
  `created_at`, `updated_at`
)
SELECT
  lower(hex(randomblob(16))),
  'TRANSFER',
  unixepoch(),
  'N/A',
  'N/A',
  (
    SELECT r.minimum_flight_time * 60
    FROM ranks r
    WHERE r.minimum_flight_time * 60 <= totals.total_minutes
    ORDER BY r.minimum_flight_time DESC
    LIMIT 1
  ),
  0,
  0,
  NULL,
  NULL,
  'Career hours seeded to preserve rank at migration',
  '',
  totals.user_id,
  'approved',
  'career',
  unixepoch(),
  unixepoch()
FROM (
  SELECT user_id, SUM(flight_time) AS total_minutes
  FROM pireps
  WHERE status = 'approved'
  GROUP BY user_id
) AS totals
WHERE
  (
    SELECT r.minimum_flight_time * 60
    FROM ranks r
    WHERE r.minimum_flight_time * 60 <= totals.total_minutes
    ORDER BY r.minimum_flight_time DESC
    LIMIT 1
  ) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM pireps p2
    WHERE p2.user_id = totals.user_id
      AND p2.flight_number = 'TRANSFER'
      AND p2.category = 'career'
      AND p2.comments = 'Career hours seeded to preserve rank at migration'
  );
