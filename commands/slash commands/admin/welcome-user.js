const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const TrackedServer = require('../../../src/models/TrackedServerSchema');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome-user')
        .setDescription('Configure welcome messages for this server')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        // 🟢 SUBCOMMAND: ENABLE
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Turn on welcome messages in a specific channel')
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('The channel to send welcome messages in')
                        .setRequired(true))
        )
        // 🔴 SUBCOMMAND: DISABLE
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Turn off welcome messages for this server')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'enable') {
            // 1. Get the channel
            const channel = interaction.options.getChannel('channel');

            // 2. Update Database (Set the ID)
            await TrackedServer.findOneAndUpdate(
                { guildId: interaction.guild.id },
                { 
                    guildId: interaction.guild.id, 
                    displayName: interaction.guild.name, 
                    welcomeChannelId: channel.id // ✅ ENABLE
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            await interaction.reply({ 
                content: `✅ **Welcome System Enabled!**\nI will now welcome new members in ${channel}.`, 
                ephemeral: true 
            });

        } else if (subcommand === 'disable') {
            // 1. Update Database (Clear the ID)
            const result = await TrackedServer.findOneAndUpdate(
                { guildId: interaction.guild.id },
                { welcomeChannelId: null } // ❌ DISABLE
            );

            if (!result) {
                return interaction.reply({ 
                    content: `❌ **Error:** This server is not set up in my database yet. Try running /enable first.`, 
                    ephemeral: true 
                });
            }

            await interaction.reply({ 
                content: `🚫 **Welcome System Disabled.**\nI will no longer send welcome messages in this server.`, 
                ephemeral: true 
            });
        }
    }
};
