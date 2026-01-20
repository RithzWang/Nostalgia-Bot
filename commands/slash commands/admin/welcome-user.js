const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const TrackedServer = require('../../../src/models/TrackedServerSchema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome-user')
        .setDescription('Set the channel for welcome messages')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel to send welcome messages in')
                .setRequired(true)),

    async execute(interaction) {
        // 1. Get the channel
        const channel = interaction.options.getChannel('channel');
        
        // 2. Find and Update the database for THIS server
        // We use upsert: true so it creates a config if one doesn't exist, 
        // though usually you want to ensure the server is already "added" via /our-servers addserver
        const updatedServer = await TrackedServer.findOneAndUpdate(
            { guildId: interaction.guild.id },
            { 
                guildId: interaction.guild.id, // Ensure ID is set
                displayName: interaction.guild.name, // Default name if new
                welcomeChannelId: channel.id 
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        await interaction.reply({ 
            content: `✅ **Welcome Channel Set!**\nI will now welcome new members in ${channel}.`, 
            ephemeral: true 
        });
    }
};
