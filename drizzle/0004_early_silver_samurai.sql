CREATE TABLE `notices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('document','notice') NOT NULL,
	`title` varchar(512) NOT NULL,
	`content` text,
	`attachmentUrl` text,
	`attachmentName` varchar(255),
	`createdBy` int NOT NULL,
	`createdByName` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `notices_id` PRIMARY KEY(`id`)
);
