const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const ServerStatsConfig = require('../../../src/models/ServerStats');
const { buildHomeMenu } = require('../../../utils/serverStatsManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server-stats')
        .setDescription('Manage the interactive Server Statistics Dashboard')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const config = await ServerStatsConfig.findOne({ guildId: interaction.guild.id });
        
        await interaction.reply({ 
            components: buildHomeMenu(config), 
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2] 
        });
    }
};
