const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const TrackedServer = require('../../../src/models/TrackedServerSchema');

// 🔒 OWNER CONFIGURATION
const OWNER_ID = '837741275603009626';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome-user')
        .setDescription('Configure welcome and warning channels')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        // 🟢 SUBCOMMAND: ENABLE
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Set up channels for this server')
                .addChannelOption(option => 
                    option.setName('welcome_channel')
                        .setDescription('Where to welcome new members')
                        .setRequired(true))
                .addChannelOption(option => 
                    option.setName('warn_channel')
                        .setDescription('Where to ping members who need to join the Main Server')
                        .setRequired(true))
        )
        // 🔴 SUBCOMMAND: DISABLE
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Turn off welcome/warn messages for this server')
        ),

    async execute(interaction) {
        // 🛑 LOCK TO OWNER
        if (interaction.user.id !== OWNER_ID) {
            return interaction.reply({ 
                content: '⛔ **Access Denied:** Only the Bot Owner can run this command.', 
                flags: MessageFlags.Ephemeral 
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'enable') {
            const welcomeChannel = interaction.options.getChannel('welcome_channel');
            const warnChannel = interaction.options.getChannel('warn_channel');

            // Update Database
            await TrackedServer.findOneAndUpdate(
                { guildId: interaction.guild.id },
                { 
                    guildId: interaction.guild.id, 
                    displayName: interaction.guild.name, 
                    welcomeChannelId: welcomeChannel.id,
                    warnChannelId: warnChannel.id 
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            await interaction.reply({ 
                content: `✅ **Configuration Saved!**\n👋 **Welcomes:** ${welcomeChannel}\n⚠️ **Warnings:** ${warnChannel}`, 
                flags: MessageFlags.Ephemeral 
            });

        } else if (subcommand === 'disable') {
            await TrackedServer.findOneAndUpdate(
                { guildId: interaction.guild.id },
                { welcomeChannelId: null, warnChannelId: null } // Clear both
            );

            await interaction.reply({ 
                content: `🚫 **System Disabled.**\nI will no longer welcome or warn users in this server.`, 
                flags: MessageFlags.Ephemeral 
            });
        }
    }
};
