const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const TrackedServer = require('../../../src/models/TrackedServerSchema');

// 🔒 OWNER CONFIGURATION
const OWNER_ID = '837741275603009626';
const MAIN_SERVER_INVITE = 'https://discord.gg/Sra726wPJs'; 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test-greet')
        .setDescription('Simulate the text-based welcome message')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: '⛔ Owner Only', flags: MessageFlags.Ephemeral });

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const config = await TrackedServer.findOne({ guildId: interaction.guild.id });
            if (!config || !config.welcomeChannelId) return interaction.editReply("❌ No welcome channel set.");
            
            const channel = interaction.guild.channels.cache.get(config.welcomeChannelId);
            if (!channel) return interaction.editReply("❌ Channel not found.");

            // 🧪 SIMULATE UNSAFE MEMBER (The Warning Message)
            await channel.send({
                content: `${interaction.user}, Welcome to **${interaction.guild.name}** server!\n\n` +
                         `It seems like you are **__not__** in our main **[A2-Q](<${MAIN_SERVER_INVITE}>)** server yet.\n` +
                         `You have **10** minutes to join, otherwise you will be **kicked**.`
            });

            await interaction.editReply(`✅ **Sent!** Check ${channel} to see the text format.`);

        } catch (e) {
            console.error(e);
            await interaction.editReply(`❌ Error: ${e.message}`);
        }
    }
};
