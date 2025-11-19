const { SlashCommandBuilder, Routes, PermissionFlagsBits, ChannelType } = require('discord.js');
const { REST } = require('@discordjs/rest');

// --- ⚠️ IMPORTANT: CONFIGURE THESE ---
// Replace with your actual IDs and Token
const BOT_TOKEN = process.env.TOKEN; 
const CLIENT_ID = '1167109778175168554'; 
const GUILD_ID = '1167046828043276379'; 
// ---------------------------------

// --- 3. Assemble and Deploy ---
// This list overwrites all existing commands on the server.
const commands = [embedCommand,editEmbedCommand].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        const data = await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();