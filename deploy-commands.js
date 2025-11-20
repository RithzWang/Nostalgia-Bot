const { REST, Routes } = require('discord.js');
const { serverID, clientId } = require('./config.json'); // Make sure clientId is in your config!
const fs = require('fs');
const path = require('path');
require('dotenv').config(); // To access process.env.TOKEN

const commands = [];
// Grab all the command files from the slashCommands directory
const foldersPath = path.join(__dirname, 'slashCommands');
const commandFiles = fs.readdirSync(foldersPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(foldersPath, file);
	const command = require(filePath);
	if ('data' in command && 'execute' in command) {
		commands.push(command.data.toJSON());
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.TOKEN);

// and deploy your commands!
(async () => {
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
            // If you don't have clientId in config, paste your Bot ID string directly here instead of clientId
			Routes.applicationGuildCommands(clientId, serverID),
			{ body: commands },
		);

		console.log(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		console.error(error);
	}
})();
