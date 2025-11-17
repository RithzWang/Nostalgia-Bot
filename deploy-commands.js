const { SlashCommandBuilder, Routes, PermissionFlagsBits, ChannelType } = require('discord.js');
const { REST } = require('@discordjs/rest');

// --- ⚠️ IMPORTANT: CONFIGURE THESE ---
// Replace with your actual IDs and Token
const BOT_TOKEN = process.env.TOKEN; 
const CLIENT_ID = '1167109778175168554'; 
const GUILD_ID = '1167046828043276379'; 
// ---------------------------------

// --- 1. /createembed Command Definition ---
const embedCommand = new SlashCommandBuilder()
    .setName('createembed')
    .setDescription('Creates a rich, custom message embed.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) 
    .addStringOption(option =>
        option.setName('title')
            .setDescription('The main title of the embed.')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('description')
            .setDescription('The main content/description of the embed.')
            .setRequired(true))
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

// --- 2. /addbutton Command Definition ---
const addButtonCommand = new SlashCommandBuilder()
    .setName('addbutton')
    .setDescription('Adds a custom link or interaction button to an existing bot message.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
        option.setName('channel')
            .setDescription('The channel where the message is located.')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText))
    .addStringOption(option =>
        option.setName('message_id')
            .setDescription('The ID of the bot message to edit.')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('label')
            .setDescription('The text displayed on the button.')
            .setRequired(true))
    .addStringOption(option => 
        option.setName('style')
            .setDescription('The color/style of the button.')
            .setRequired(true)
            .addChoices(
                { name: 'Primary (Blurple)', value: 'Primary' },
                { name: 'Secondary (Grey)', value: 'Secondary' },
                { name: 'Success (Green)', value: 'Success' },
                { name: 'Danger (Red)', value: 'Danger' },
                { name: 'Link (Blue/URL)', value: 'Link' }
            ))
    .addStringOption(option => 
        option.setName('url')
            .setDescription('The URL the button links to (required if style is Link).')
            .setRequired(false))
    .addStringOption(option => 
        option.setName('custom_id')
            .setDescription('A unique ID for the bot to track interaction (required if style is not Link).')
            .setRequired(false))
    .addBooleanOption(option => 
        option.setName('disabled')
            .setDescription('Set to true to make the button unclickable/disabled (locked).')
            .setRequired(false));


// --- 3. Assemble and Deploy ---
// This list overwrites all existing commands on the server.
const commands = [embedCommand, addButtonCommand].map(command => command.toJSON());

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