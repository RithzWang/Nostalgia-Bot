const { REST, Routes } = require('discord.js');

const token = process.env.TOKEN; 
const clientId = '1167109778175168554'; 
const guildId = '1167046828043276379';

const rest = new REST().setToken(token);

// ...

rest
	.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] })
	.then(() => console.log('Successfully deleted all guild commands.'))
	.catch(console.error);
// for global commands
rest
	.put(Routes.applicationCommands(clientId), { body: [] })
	.then(() => console.log('Successfully deleted all application commands.'))
	.catch(console.error);