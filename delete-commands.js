const { REST, Routes } = require('discord.js');

const clientId = "1167109778175168554";
const guildId = "1167046828043276379";
const token = process.env.TOKEN;

const rest = new REST({ version: '10' }).setToken(token);

// ...
(async () => {
	try {
		console.log('Started deleting all commands.');

		// 1. Delete all GUILD-based commands (for a specific server)
		// Useful if you were testing in one specific server
		await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
		console.log('Successfully deleted all guild commands.');

		// 2. Delete all GLOBAL commands (for all servers)
		// Note: Global updates can take up to 1 hour to reflect in Discord, but usually faster
		await rest.put(Routes.applicationCommands(clientId), { body: [] });
		console.log('Successfully deleted all global application commands.');

	} catch (error) {
		console.error(error);
	}
})();
