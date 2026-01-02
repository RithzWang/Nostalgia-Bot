const { REST, Routes } = require('discord.js');
require('dotenv').config(); // Load .env file if you have one

// --- CONFIGURATION ---
// 1. Your Bot Token (It tries to get it from .env, otherwise paste it in quotes)
const token = process.env.TOKEN || 'YOUR_TOKEN_HERE';

// 2. Your Specific IDs (Filled in for you)
const clientId = '1456198981301440587';       // Your Bot ID
const guildId = '1456197054782111756';        // Your Server ID

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('🗑️  Started deleting all commands...');

        // 1. Delete GUILD commands (Specific to your server)
        console.log(`...Deleting commands for Guild: ${guildId}`);
        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: [] },
        );
        console.log('✅ Successfully deleted all GUILD commands.');

        // 2. Delete GLOBAL commands (For all servers)
        console.log('...Deleting GLOBAL commands');
        await rest.put(
            Routes.applicationCommands(clientId),
            { body: [] },
        );
        console.log('✅ Successfully deleted all GLOBAL commands.');

    } catch (error) {
        console.error('❌ Error deleting commands:', error);
    }
})();
