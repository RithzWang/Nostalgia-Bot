const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const EmojiChannel = require('../../../src/models/EmojiChannelSchema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('emoji-channel')
        .setDescription('Auto-upload images sent in a specific channel as emojis')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions)
        .addSubcommand(sub => 
            sub.setName('enable')
                .setDescription('Set the channel for auto-emoji uploads')
                .addChannelOption(opt => 
                    opt.setName('channel')
                        .setDescription('The channel to watch')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub => 
            sub.setName('disable')
                .setDescription('Disable auto-emoji uploads')
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        // --- ENABLE ---
        if (sub === 'enable') {
            const channel = interaction.options.getChannel('channel');

            // Update or Create (Upsert)
            await EmojiChannel.findOneAndUpdate(
                { guildId },
                { guildId, channelId: channel.id },
                { upsert: true, new: true }
            );

            return interaction.reply({ 
                content: `<:yes:1297814648417943565> **Enabled!** Any image sent in ${channel} will now be uploaded as a server emoji.`,
                ephemeral: true 
            });
        }

        // --- DISABLE ---
        if (sub === 'disable') {
            const deleted = await EmojiChannel.findOneAndDelete({ guildId });

            if (!deleted) {
                return interaction.reply({ 
                    content: `<:no:1297814819105144862> Emoji Channel is not enabled on this server.`,
                    ephemeral: true 
                });
            }

            return interaction.reply({ 
                content: `<:yes:1297814648417943565> **Disabled.** Images will no longer be auto-uploaded.`,
                ephemeral: true 
            });
        }
    }
};
