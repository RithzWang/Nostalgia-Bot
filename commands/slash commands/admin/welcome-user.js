const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const TrackedServer = require('../../../src/models/TrackedServerSchema');

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
                        .setRequired(true)) // Making it required so you don't forget it
        )
        // 🔴 SUBCOMMAND: DISABLE
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Turn off welcome/warn messages for this server')
        ),

    async execute(interaction) {
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
                    warnChannelId: warnChannel.id // ✅ SAVING WARN CHANNEL
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            await interaction.reply({ 
                content: `✅ **Configuration Saved!**\n👋 **Welcomes:** ${welcomeChannel}\n⚠️ **Warnings:** ${warnChannel}`, 
                ephemeral: true 
            });

        } else if (subcommand === 'disable') {
            await TrackedServer.findOneAndUpdate(
                { guildId: interaction.guild.id },
                { welcomeChannelId: null, warnChannelId: null } // Clear both
            );

            await interaction.reply({ 
                content: `🚫 **System Disabled.**\nI will no longer welcome or warn users in this server.`, 
                ephemeral: true 
            });
        }
    }
};
