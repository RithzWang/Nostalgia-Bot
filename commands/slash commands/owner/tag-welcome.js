const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const TrackedServer = require('../../src/models/TrackedServerSchema');

// 🔒 OWNER CONFIGURATION
const OWNER_ID = '837741275603009626';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome-user')
        .setDescription('Configure the welcome system (with security check)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        
        // 🟢 SUBCOMMAND: ENABLE
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Set the welcome channel')
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('Select the channel')
                        .setRequired(true))
        )
        
        // 🔴 SUBCOMMAND: DISABLE
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Stop welcoming and security checks')
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
            const channel = interaction.options.getChannel('channel');

            // Save to Database
            await TrackedServer.findOneAndUpdate(
                { guildId: interaction.guild.id },
                { 
                    guildId: interaction.guild.id, 
                    displayName: interaction.guild.name, 
                    welcomeChannelId: channel.id
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );

            await interaction.reply({ 
                content: `✅ **System Enabled!**\nNew members will be welcomed in: ${channel}\n*(Users not in Main Hub will be warned here)*`, 
                flags: MessageFlags.Ephemeral 
            });

        } else if (subcommand === 'disable') {
            // Remove from Database
            await TrackedServer.findOneAndUpdate(
                { guildId: interaction.guild.id },
                { welcomeChannelId: null }
            );

            await interaction.reply({ 
                content: `🚫 **System Disabled.**\nI will no longer send welcomes or run security checks here.`, 
                flags: MessageFlags.Ephemeral 
            });
        }
    }
};
