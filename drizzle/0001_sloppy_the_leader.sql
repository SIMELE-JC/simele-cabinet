CREATE TABLE `chatMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dossierId` int NOT NULL,
	`role` enum('user','assistant','system') NOT NULL,
	`content` text NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chatMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nom` varchar(255) NOT NULL,
	`prenom` varchar(255),
	`email` varchar(320),
	`telephone` varchar(50),
	`situation` varchar(100),
	`titreProjet` varchar(500),
	`descriptionProjet` text,
	`secteurActivite` varchar(255),
	`stadeAvancement` enum('idee','structurable','avance','en_cours') DEFAULT 'idee',
	`statut` enum('prospect','en_cours','suivi','clos') NOT NULL DEFAULT 'prospect',
	`scoreTotal` float,
	`niveauMaturite` enum('flou','structurable','avance'),
	`niveauMotivation` enum('elevee','moyenne','faible'),
	`capaciteFinanciere` enum('forte','moyenne','faible'),
	`recommandation` varchar(500),
	`conseillerId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dossiers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`type` enum('entretien_initial','diagnostic','suivi') NOT NULL,
	`titre` varchar(500),
	`statut` enum('brouillon','finalise') NOT NULL DEFAULT 'brouillon',
	`ficheStructuree` json,
	`scoreClarte` float,
	`scoreMarche` float,
	`scoreModeleEco` float,
	`scoreFaisabilite` float,
	`scoreMotivation` float,
	`scoreCapacitePayer` float,
	`scoreTotal` float,
	`interpretationScore` varchar(100),
	`notesBrutes` text,
	`audioUrl` varchar(1000),
	`transcription` text,
	`conseillerId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dossiers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suiviClients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`dateEchange` timestamp NOT NULL DEFAULT (now()),
	`avancement` text,
	`actionsRealisees` text,
	`prochainesEtapes` text,
	`pointsBlockage` text,
	`conseillerId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suiviClients_id` PRIMARY KEY(`id`)
);
