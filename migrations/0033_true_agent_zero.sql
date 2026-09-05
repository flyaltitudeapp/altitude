CREATE TABLE `typerating_aircraft` (
	`id` text PRIMARY KEY NOT NULL,
	`typerating_id` text NOT NULL,
	`aircraft_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`typerating_id`) REFERENCES `typeratings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`aircraft_id`) REFERENCES `aircraft`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `typerating_aircraft_typerating_id_index` ON `typerating_aircraft` (`typerating_id`);--> statement-breakpoint
CREATE INDEX `typerating_aircraft_aircraft_id_index` ON `typerating_aircraft` (`aircraft_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `typerating_aircraft_unique` ON `typerating_aircraft` (`typerating_id`,`aircraft_id`);--> statement-breakpoint
CREATE TABLE `typeratings` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `typeratings_name_unique` ON `typeratings` (`name`);--> statement-breakpoint
CREATE INDEX `typeratings_name_index` ON `typeratings` (`name`);--> statement-breakpoint
CREATE TABLE `user_typeratings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`typerating_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`typerating_id`) REFERENCES `typeratings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_typeratings_user_id_index` ON `user_typeratings` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_typeratings_typerating_id_index` ON `user_typeratings` (`typerating_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_typeratings_unique` ON `user_typeratings` (`user_id`,`typerating_id`);--> statement-breakpoint
ALTER TABLE `ranks` ADD `type_rating_slots` integer DEFAULT 0 NOT NULL;