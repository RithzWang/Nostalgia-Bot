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
        // 🛑 SECURITY: LOCK TO OWNER
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ 
                content: '⛔ **Access Denied:** Only the Bot Owner can run this setup command.', 
                flags: MessageFlags.Ephemeral 
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // Get Inputs
        const welcomeInput = interaction.options.getChannel('channel');
        const warnInput = interaction.options.getChannel('warn_channel');
        const tagRole = interaction.options.getRole('tag_user_role');

        // 🛡️ ROLE HIERARCHY CHECK
        if (tagRole.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.editReply({ 
                content: `❌ **Role Error:** I cannot manage the role ${tagRole} because it is higher than my highest role. Please drag my bot role above it in Server Settings.` 
            });
        }

        try {
            // ✅ Update Database
            await TrackedServer.findOneAndUpdate(
                { guildId: interaction.guild.id },
                { 
                    guildId: interaction.guild.id, 
                    displayName: interaction.guild.name, 
                    welcomeChannelId: welcomeInput.id,
                    warnChannelId: warnInput.id,
                    localRoleId: tagRole.id 
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            // ✅ Create Success Container
            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ✅ Setup Complete`)
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**👋 Welcome Channel:** <#${welcomeInput.id}>\n` +
                        `**⚠️ Warn Channel:** <#${warnInput.id}>\n` +
                        `**🏷️ Local Tag Role:** <@&${tagRole.id}>`
                    )
                );

            // ✅ Send with V2 Flag (Vital!)
            await interaction.editReply({ 
                components: [container],
                flags: [MessageFlags.IsComponentsV2] 
            });

        } catch (e) {
            console.error(e);
            await interaction.editReply(`❌ **Database Error:** ${e.message}`);
        }
    }
};
