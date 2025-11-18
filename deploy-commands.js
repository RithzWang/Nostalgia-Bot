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

// --- 2. /edit-embed Command Definition ---
const editEmbedCommand = new SlashCommandBuilder()
    .setName('edit-embed')
    .setDescription('Edits the content, color, or images of an existing embed.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
        option.setName('channel')
            .setDescription('The channel where the message is located.')
            .setRequired(true)
            .addChannelTypes(ChannelType.GuildText))
    .addStringOption(option =>
        option.setName('message_id')
            .setDescription('The ID of the bot message containing the embed.')
            .setRequired(true))
    .addStringOption(option => option.setName('title').setDescription('The new main title of the embed.').setRequired(false))
    .addStringOption(option => option.setName('description').setDescription('The new main content/description of the embed.').setRequired(false))
    .addStringOption(option => option.setName('color').setDescription('The new hex color code (e.g., #00FFFF).').setRequired(false))
    .addStringOption(option => option.setName('footer').setDescription('The new text for the footer.').setRequired(false))
    .addStringOption(option => option.setName('image').setDescription('A new direct URL for the main image.').setRequired(false))
    .addStringOption(option => option.setName('thumbnail').setDescription('A new direct URL for the thumbnail image.').setRequired(false));

// --- 3. Assemble and Deploy ---
// This list overwrites all existing commands on the server.
const commands = [embedCommand, addButtonCommand, editEmbedCommand].map(command => command.toJSON());

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