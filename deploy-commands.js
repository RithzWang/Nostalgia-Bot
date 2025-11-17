// This script registers the command with the Discord API. 
// It needs to be run *once* when you add/change slash commands.

const { SlashCommandBuilder, Routes, PermissionFlagsBits } = require('discord.js');
const { REST } = require('@discordjs/rest');

// --- IMPORTANT: CONFIGURE THESE ---
// Replace with your actual IDs and Token
const BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE'; 
const CLIENT_ID = 'YOUR_CLIENT_ID_HERE'; 
const GUILD_ID = 'YOUR_SERVER_ID_HERE'; // Guild ID is recommended for faster testing
// ---------------------------------

const embedCommand = new SlashCommandBuilder()
    .setName('createembed')
    .setDescription('Creates a rich, custom message embed.')
    // Restrict use to Administrators only
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) 
    
    // --- REQUIRED OPTIONS ---
    .addStringOption(option =>
        option.setName('title')
            .setDescription('The main title of the embed.')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('description')
            .setDescription('The main content/description of the embed.')
            .setRequired(true))

    // --- OPTIONAL OPTIONS ---
    .addStringOption(option =>
        option.setName('color')
            .setDescription('The hex color code (e.g., #FF0000).')
            .setRequired(false))
    .addChannelOption(option =>
        option.setName('channel')
            .setDescription('The channel where the embed should be sent (defaults to current channel).')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('footer')
            .setDescription('The text for the small footer at the bottom.')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('image')
            .setDescription('A direct URL for the main image (must be a valid image link).')
            .setRequired(false))
    .addStringOption(option =>
        option.setName('thumbnail')
            .setDescription('A direct URL for the thumbnail image (small image in the corner).')
            .setRequired(false));

const commands = [embedCommand].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // Register commands to a specific guild (faster deployment)
        const data = await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();