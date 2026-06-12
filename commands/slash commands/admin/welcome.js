const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const WelcomeConfig = require('../../../src/models/Welcome'); // Adjust the path to your models folder

module.exports = {
    data: new SlashCommandBuilder()
        .setName('random-welcome')
        .setDescription('Manage the random welcome message system')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => 
            sub.setName('setup')
               .setDescription('Setup the welcome channel')
               .addChannelOption(opt => opt.setName('channel').setDescription('The channel to send welcome messages in').setRequired(true))
        )
        .addSubcommand(sub => 
            sub.setName('disable')
               .setDescription('Disable the welcome messages')
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            if (subcommand === 'setup') {
                const channel = interaction.options.getChannel('channel');
                
                await WelcomeConfig.findOneAndUpdate(
                    { guildId },
                    { guildId, channelId: channel.id },
                    { upsert: true, new: true }
                );

                return interaction.reply({ 
                    content: `✅ Welcome messages will now be randomly sent in <#${channel.id}>!`, 
                    flags: [MessageFlags.Ephemeral] 
                });
            }

            if (subcommand === 'disable') {
                const deleted = await WelcomeConfig.findOneAndDelete({ guildId });
                
                if (!deleted) {
                    return interaction.reply({ 
                        content: "❌ Welcome messages are not currently set up for this server.", 
                        flags: [MessageFlags.Ephemeral] 
                    });
                }

                return interaction.reply({ 
                    content: "✅ Welcome messages have been disabled.", 
                    flags: [MessageFlags.Ephemeral] 
                });
            }
        } catch (error) {
            console.error("Welcome Command Error:", error);
            return interaction.reply({ 
                content: "❌ An error occurred while processing your request.", 
                flags: [MessageFlags.Ephemeral] 
            });
        }
    }
};
