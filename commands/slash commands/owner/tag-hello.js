const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize 
} = require('discord.js');
const TrackedServer = require('../../../src/models/TrackedServerSchema');

// 🔒 OWNER CONFIGURATION
const OWNER_ID = '837741275603009626';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tag-hello')
        .setDescription('Configure welcome channel, warn channel, and the local tag role')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('Where to welcome new members')
                .setRequired(true))
        .addChannelOption(option => 
            option.setName('warn_channel')
                .setDescription('Where to ping members who fail the security check')
                .setRequired(true))
        .addRoleOption(option => 
            option.setName('tag_user_role')
                .setDescription('The role to give users who have the tag')
                .setRequired(true)),

    async execute(interaction) {
        // 🛑 LOCK TO OWNER
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ 
                content: '⛔ **Access Denied:** Only the Bot Owner can run this setup command.', 
                flags: MessageFlags.Ephemeral 
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const welcomeChannel = interaction.options.getChannel('channel');
        const warnChannel = interaction.options.getChannel('warn_channel');
        const tagRole = interaction.options.getRole('tag_user_role');

        // 🛡️ SAFETY CHECKS
        if (!welcomeChannel || !warnChannel) {
            return interaction.editReply({ content: "❌ Error: One of the channels could not be accessed. Please ensure I have 'View Channel' permissions." });
        }

        // Check Permissions
        if (tagRole.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.editReply({ 
                content: `❌ **Error:** I cannot manage the role ${tagRole} because it is higher than my highest role. Please move my bot role above it.` 
            });
        }

        try {
            await TrackedServer.findOneAndUpdate(
                { guildId: interaction.guild.id },
                { 
                    guildId: interaction.guild.id, 
                    displayName: interaction.guild.name, 
                    welcomeChannelId: welcomeChannel.id,
                    warnChannelId: warnChannel.id,
                    localRoleId: tagRole.id 
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            // Success Container
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ✅ Setup Complete`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**👋 Welcome Channel:** <#${welcomeChannel.id}>\n` +
                        `**⚠️ Warn Channel:** <#${warnChannel.id}>\n` +
                        `**🏷️ Local Tag Role:** <@&${tagRole.id}>`
                    )
                );

            await interaction.editReply({ 
                components: [container],
                flags: [MessageFlags.IsComponentsV2] // 👈 Vital for Containers
            });

        } catch (e) {
            console.error(e);
            await interaction.editReply(`❌ **Database Error:** ${e.message}`);
        }
    }
};
