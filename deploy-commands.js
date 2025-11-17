const { Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');

// --- IMPORTANT: CONFIGURE THESE ---
// 1. Fill in your Bot Token and IDs
const BOT_TOKEN = process.env.TOKEN; 
const CLIENT_ID = '1167109778175168554'; 
const GUILD_ID = '1167046828043276379'; 
// ---------------------------------

// 2. These are the IDs of the commands you want to delete
const COMMAND_IDS_TO_DELETE = [
    "1176522461991415848", // Likely the old /imagine command
    "1176522460091383931"  // Likely the old /ping command
];

const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

(async () => {
    try {
        console.log(`Starting deletion process for ${COMMAND_IDS_TO_DELETE.length} old commands...`);

        for (const commandId of COMMAND_IDS_TO_DELETE) {
            // Delete the specific command from the Guild (Server)
            await rest.delete(
                Routes.applicationGuildCommand(CLIENT_ID, GUILD_ID, commandId)
            );
            console.log(`✅ Successfully deleted command ID: ${commandId}`);
        }
        
        console.log('---');
        console.log('Deletion Complete. Running standard deployment to confirm current commands.');
        
        // After deletion, run the overwrite script (which you already have ready)
        // to ensure only /createembed is active.
        
        // Note: You must run the node deploy-commands.js script separately after this!

    } catch (error) {
        console.error("Failed to delete one or more commands:", error);
    }
})();