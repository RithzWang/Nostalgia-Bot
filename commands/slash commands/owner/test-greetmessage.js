const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const TrackedServer = require('../../../src/models/TrackedServerSchema');

// 🔒 OWNER CONFIGURATION
const OWNER_ID = '837741275603009626';
const MAIN_SERVER_INVITE = 'https://discord.gg/Sra726wPJs'; 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('test-greet')
        .setDescription('Simulate the welcome message')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('scenario')
                .setDescription('Which version do you want to see?')
                .setRequired(true)
                .addChoices(
                    { name: '✅ Safe User (In Main Server)', value: 'safe' },
                    { name: '⚠️ Unsafe User (Not in Main Server)', value: 'unsafe' }
                )
        )
        .addUserOption(option => 
            option.setName('target')
                .setDescription('Simulate welcome for a specific user (Defaults to you)')
                .setRequired(false)
        ),

    async execute(interaction) {
        if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: '⛔ Owner Only', flags: MessageFlags.Ephemeral });

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const config = await TrackedServer.findOne({ guildId: interaction.guild.id });
            if (!config || !config.welcomeChannelId) return interaction.editReply("❌ No welcome channel set. Run `/our-servers greetmessage` first.");
            
            const channel = interaction.guild.channels.cache.get(config.welcomeChannelId);
            if (!channel) return interaction.editReply(`❌ Channel not found (ID: ${config.welcomeChannelId}).`);

            const scenario = interaction.options.getString('scenario');
            // Use the targeted user, or default to the command runner
            const targetUser = interaction.options.getUser('target') || interaction.user;

            if (scenario === 'safe') {
                // ✅ SCENARIO A: Safe User
                await channel.send({
                    content: `${targetUser}, Welcome to **${interaction.guild.name}** server!`
                });
                await interaction.editReply(`✅ **Sent "Safe" Version** to ${channel} for ${targetUser}.`);
            } 
            else {
                // ⚠️ SCENARIO B: Unsafe User
                await channel.send({
                    content: `${targetUser}, Welcome to **${interaction.guild.name}** server!\n\n` +
                             `It seems like you are **__not__** in our main **[A2-Q](<${MAIN_SERVER_INVITE}>)** server yet.\n` +
                             `You have **10** minutes to join, otherwise you will be **kicked**.`
                });
                await interaction.editReply(`✅ **Sent "Unsafe" Version** to ${channel} for ${targetUser}.`);
            }

        } catch (e) {
            console.error(e);
            await interaction.editReply(`❌ Error: ${e.message}`);
        }
    }
};
