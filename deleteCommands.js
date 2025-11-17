const { REST, Routes } = require('discord.js');

const token = process.env.TOKEN; 
const clientId = '1167109778175168554'; 
const guildId = '1167046828043276379';

const rest = new REST().setToken(token);

// ...

// for guild-based commands
rest
	.delete(Routes.applicationGuildCommand(clientId, guildId, 'commandId'))
	.then(() => console.log('Successfully deleted guild command'))
	.catch(console.error);

// for global commands
rest
	.delete(Routes.applicationCommand(clientId, 'commandId'))
	.then(() => console.log('Successfully deleted application command'))
	.catch(console.error);