const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ChannelType, 
    MessageFlags 
} = require('discord.js');

// ⚠️ YOUR OWNER ID
const OWNER_ID = '837741275603009626';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create-invite')
        .setDescription('Creates a permanent invite for a specific channel (Owner Only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.CreateInstantInvite)
        .setDMPermission(false) // Disable in DMs
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel to create the invite for (defaults to current)')
                .addChannelTypes(
                    ChannelType.GuildText, 
                    ChannelType.GuildVoice, 
                    ChannelType.GuildAnnouncement,
                    ChannelType.GuildStageVoice,
                    ChannelType.GuildForum
                )
        ),

    async execute(interaction) {
        // 1. Strict Owner Security Check
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ 
                content: '⛔ This command is restricted to the **Bot Owner** only.', 
                flags: MessageFlags.Ephemeral 
            });
        }

        // 2. Get the channel (Handle both "selected" and "current")
        let targetChannel = interaction.options.getChannel('channel') || interaction.channel;

        try {
            // 3. CRITICAL FIX: Fetch the full channel object to ensure we have methods like createInvite
            targetChannel = await interaction.guild.channels.fetch(targetChannel.id);

            // 4. Permission Check: Does the BOT have permission in that specific channel?
            if (!targetChannel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.CreateInstantInvite)) {
                return interaction.reply({ 
                    content: `<:no:1297814819105144862> I do not have permission to create invites in ${targetChannel}. \nCheck the channel settings > Permissions > **Create Invite**.`, 
                    flags: MessageFlags.Ephemeral 
                });
            }

            // 5. Create the invite
            const invite = await targetChannel.createInvite({
                maxAge: 0,   // Permanent (0 seconds)
                maxUses: 0,  // Unlimited
                unique: true,
                reason: `Requested by Owner (${interaction.user.tag})`
            });

            await interaction.reply({ 
                content: `<:yes:1297814648417943565> Here is the permanent invite link for ${targetChannel}:\n${invite.url}`,
                flags: MessageFlags.Ephemeral 
            });

        } catch (err) {
            console.error('Failed to create invite:', err);
            await interaction.reply({ 
                content: `<:no:1297814819105144862> Failed to create invite. \n**Error:** \`${err.message}\`\n(Make sure I have "View Channel" and "Create Invite" permissions there!)`,
                flags: MessageFlags.Ephemeral 
            });
        }
    }
};
