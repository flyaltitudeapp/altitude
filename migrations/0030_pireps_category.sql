ALTER TABLE `pireps` ADD `category` text DEFAULT 'casual' NOT NULL;--> statement-breakpoint
DROP INDEX `pireps_user_status_index`;--> statement-breakpoint
DROP INDEX `pireps_analytics_covering`;--> statement-breakpoint
DROP INDEX `pireps_daily_stats`;--> statement-breakpoint
CREATE INDEX `pireps_user_status_index` ON `pireps` (`user_id`,`status`,`category`);--> statement-breakpoint
CREATE INDEX `pireps_analytics_covering` ON `pireps` (`status`,`category`,`date`,`user_id`,`flight_time`);--> statement-breakpoint
CREATE INDEX `pireps_daily_stats` ON `pireps` (`status`,`category`,`date`,`flight_time`);
