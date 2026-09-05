DROP INDEX `pireps_analytics_covering`;--> statement-breakpoint
DROP INDEX `pireps_daily_stats`;--> statement-breakpoint
CREATE INDEX `pireps_analytics_covering` ON `pireps` (`status`,`date`,`category`,`user_id`,`flight_time`);--> statement-breakpoint
CREATE INDEX `pireps_daily_stats` ON `pireps` (`status`,`date`,`category`,`flight_time`);
