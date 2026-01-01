const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');

// ⚠️ YOUR OWNER ID
const OWNER_ID = '837741275603009626';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create-invite')
        .setDescription('Creates a permanent invite for a specific channel (Owner Only)')
        // Optional: Sets default permission to Admin so regular users don't see it in the list
        .setDefaultMemberPermissions(PermissionFlagsBits.CreateInstantInvite)
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel to create the invite for (defaults to current)')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.GuildAnnouncement)
        ),

    async execute(interaction) {
        // 1. Strict Owner Security Check
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ 
                content: '⛔ This command is restricted to the **Bot Owner** only.', 
                ephemeral: true 
            });
        }

        // 2. Determine target channel (defaults to current channel if not provided)
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

        try {
            // 3. Create the invite
            const invite = await targetChannel.createInvite({
                maxAge: 0,   // Permanent (0 seconds)
                maxUses: 0,   // Unlimited
                unique: true
            });

            await interaction.reply({ 
                content: `✅ Here is the permanent invite link for ${targetChannel.toString()}:\n${invite.url}` 
            });

        } catch (err) {
            console.error('Failed to create invite:', err);
            await interaction.reply({ 
                content: `❌ I could not create an invite for ${targetChannel.toString()}. Please ensure I have the "Create Invite" permission in that channel.`,
                ephemeral: true 
            });
        }
    }
};
