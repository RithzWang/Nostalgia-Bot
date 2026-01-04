const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ChannelType, 
    MessageFlags 
} = require('discord.js');
const ChatBot = require('../../../src/models/ChatBot'); // Import the model

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chatbot')
        .setDescription('Configure the AI Chatbot')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Set the channel for the AI to talk in')
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('The channel where the bot should chat')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Turn off the AI Chatbot for this server')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild), // Admin/Manager only

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'setup') {
            const channel = interaction.options.getChannel('channel');

            try {
                // Save or Update the channel in DB
                await ChatBot.findOneAndUpdate(
                    { GuildID: interaction.guild.id },
                    { ChannelID: channel.id },
                    { upsert: true, new: true }
                );

                return interaction.reply({ 
                    content: `✅ **AI Chatbot Enabled!**\nI will now reply to all messages in ${channel}.`,
                    flags: MessageFlags.Ephemeral
                });
            } catch (err) {
                console.error(err);
                return interaction.reply({ content: '❌ Database error.', flags: MessageFlags.Ephemeral });
            }
        }

        if (subcommand === 'disable') {
            try {
                const deleted = await ChatBot.findOneAndDelete({ GuildID: interaction.guild.id });
                
                if (deleted) {
                    return interaction.reply({ content: '✅ **AI Chatbot Disabled.** I will stop talking.', flags: MessageFlags.Ephemeral });
                } else {
                    return interaction.reply({ content: '⚠️ It was not enabled.', flags: MessageFlags.Ephemeral });
                }
            } catch (err) {
                console.error(err);
                return interaction.reply({ content: '❌ Database error.', flags: MessageFlags.Ephemeral });
            }
        }
    }
};
