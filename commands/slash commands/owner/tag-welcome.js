const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const TrackedServer = require('../../../src/models/TrackedServerSchema');

// 🔒 OWNER CONFIGURATION
const OWNER_ID = '837741275603009626';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcome-user')
        .setDescription('Configure the welcome system')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Set the welcome channel')
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('Select the channel')
                        .setRequired(true))
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Stop welcoming users')
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
            
            // 1. Check existing settings first
            const existing = await TrackedServer.findOne({ guildId: interaction.guild.id });

            // 2. If it's ALREADY enabled in this exact channel, just tell them.
            if (existing && existing.welcomeChannelId === channel.id) {
                return interaction.reply({ 
                    content: `ℹ️ **Already Enabled:** The welcome system is already active in ${channel}.`, 
                    flags: MessageFlags.Ephemeral 
                });
            }

            try {
                // 3. Otherwise, Save/Update it
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
                    content: `✅ **System Enabled!**\nNew members will be welcomed in: ${channel}`, 
                    flags: MessageFlags.Ephemeral 
                });

            } catch (e) {
                console.error(e);
                // 4. Handle "Duplicate Key" errors cleanly
                if (e.code === 11000) {
                     return interaction.reply({ 
                        content: `⚠️ **Database Conflict:** I cannot save this because another server entry might be conflicting. Please run the \`fix-database.js\` script I gave you to clean up old data rules.`, 
                        flags: MessageFlags.Ephemeral 
                    });
                }
                return interaction.reply({ content: `❌ **Error:** ${e.message}`, flags: MessageFlags.Ephemeral });
            }

        } else if (subcommand === 'disable') {
            await TrackedServer.findOneAndUpdate(
                { guildId: interaction.guild.id },
                { welcomeChannelId: null }
            );

            await interaction.reply({ 
                content: `🚫 **System Disabled.**\nI will no longer send welcome messages here.`, 
                flags: MessageFlags.Ephemeral 
            });
        }
    }
};
