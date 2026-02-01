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
        .setName('tag-welcome')
        .setDescription('Set the welcome channel (Warns users if they are not in Main Hub)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('Where to welcome new members')
                .setRequired(true)),

    async execute(interaction) {
        // 🛑 LOCK TO OWNER
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ 
                content: '⛔ **Access Denied:** Only the Bot Owner can run this command.', 
                flags: MessageFlags.Ephemeral 
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const channel = interaction.options.getChannel('channel');

        try {
            // Check Permissions
            const targetChannel = await interaction.guild.channels.fetch(channel.id);
            if (!targetChannel) throw new Error("I cannot access that channel.");

            // ✅ Save to Database (and clear old settings)
            await TrackedServer.findOneAndUpdate(
                { guildId: interaction.guild.id },
                { 
                    guildId: interaction.guild.id, 
                    displayName: interaction.guild.name, 
                    welcomeChannelId: channel.id,
                    
                    // 🚫 CLEAR old settings (No roles, no separate warn channel)
                    localRoleId: null,
                    warnChannelId: null 
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            const container = new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ✅ Welcome System Configured`))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `**Channel:** ${channel}\n` +
                    `**Logic:** New members will be welcomed.\n` +
                    `**Security:** If not in Main Hub, a warning will be added to the welcome message.`
                ));

            await interaction.editReply({ 
                components: [container],
                flags: [MessageFlags.IsComponentsV2] 
            });

        } catch (e) {
            console.error(e);
            await interaction.editReply(`❌ **Error:** ${e.message}`);
        }
    }
};
