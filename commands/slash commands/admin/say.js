const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Make the bot say a message')
        // 1. The Content (Required)
        .addStringOption(option =>
            option.setName('content')
                .setDescription('What should the bot say?')
                .setRequired(true)
        )
        // 2. The Channel (Optional)
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Where should the bot send this? (Leave empty for here)')
                .addChannelTypes(ChannelType.GuildText) // Only allow text channels
                .setRequired(false)
        )
        // Security: Only allow people with "Manage Messages" permission to use this
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Get the options
        const content = interaction.options.getString('content');
        // If they didn't pick a channel, use the current one (interaction.channel)
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

        try {
            // Send the message to the target channel
            await targetChannel.send(content);

            // Reply to the user (Hidden) so they know it worked
            await interaction.reply({ 
                content: `✅ Sent message to ${targetChannel}`, 
                flags: MessageFlags.Ephemeral // Uses the new flags method!
            });

        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: `❌ I couldn't send the message. Do I have permission to talk in ${targetChannel}?`, 
                flags: MessageFlags.Ephemeral 
            });
        }
    },
};
