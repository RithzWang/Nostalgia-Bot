const { REST, Routes } = require('discord.js');
require('dotenv').config();
const config = require('./config.json');

// ⚠️ FILL THIS IN
const CLIENT_ID = config.clientId; // Right click your bot -> Copy ID
const GUILD_ID = config.serverID;     // Or replace with specific Server ID string

const token = process.env.TOKEN;

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log(`🗑️  Started deleting all guild commands for Guild ID: ${GUILD_ID}...`);

        // This path overwrites existing commands with an empty array []
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: [] },
        );

        console.log('✅ Successfully deleted all guild commands.');
        console.log('   (You can now rely on your Global commands!)');

    } catch (error) {
        console.error(error);
    }
})();
