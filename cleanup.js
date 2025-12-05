const { REST, Routes } = require('discord.js');

// 1. PASTE THE TOKEN YOU JUST COPIED FROM THE DEVELOPER PORTAL HERE
const token = process.env.TOKEN;

// 2. PASTE THE CLIENT ID (APPLICATION ID) OF THAT SAME BOT HERE
const clientId = '1167109778175168554';

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
	try {
		console.log('Started clearing application (/) commands...');

		// This sends an empty list [] to Discord, effectively deleting everything.
		await rest.put(Routes.applicationCommands(clientId), { body: [] });

		console.log('Successfully deleted all commands.');
        console.log('You can now use this Token and Client ID for your new code!');
	} catch (error) {
		console.error(error);
	}
})();
