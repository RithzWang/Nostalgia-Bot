const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const ServerInfoSchema = require('../../../src/models/ServerInfoSchema'); 
const { generateServerInfoPayload } = require('../../../utils/serverInfoUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('servers-info')
        .setDescription('Setup the live server info display')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option => 
            option.setName('message_id')
                .setDescription('The ID of the existing message (Must be in the channel selected below!)')
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel where the message is located')
                .setRequired(false)),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ Admin only.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
        const targetMessageId = interaction.options.getString('message_id');
        const client = interaction.client;

        try {
            const payloadComponents = await generateServerInfoPayload(client);
            let message;

            if (targetMessageId) {
                // --- EDIT EXISTING ---
                try {
                    message = await targetChannel.messages.fetch(targetMessageId);
                    await message.edit({ 
                        components: payloadComponents,
                        flags: [MessageFlags.IsComponentsV2] // 👈 REQUIRED FOR NEW UI
                    });
                } catch (e) {
                    console.error("Fetch Error:", e);
                    return interaction.editReply({ 
                        content: `❌ **Failed to find message!**\n\n1. Check ID: \`${targetMessageId}\`\n2. Channel: ${targetChannel}\n3. Ensure I have View permissions.` 
                    });
                }
            } else {
                // --- SEND NEW ---
                message = await targetChannel.send({ 
                    components: payloadComponents,
                    flags: [MessageFlags.IsComponentsV2] // 👈 REQUIRED FOR NEW UI
                });
            }

            // Save to DB
            await ServerInfoSchema.findOneAndUpdate(
                { guildId: interaction.guild.id }, 
                { 
                    guildId: interaction.guild.id,
                    channelId: targetChannel.id,
                    messageId: message.id 
                },
                { upsert: true, new: true }
            );

            // Start Interval
            const intervalTime = 5 * 60 * 1000;
            setInterval(async () => {
                try {
                    const newPayload = await generateServerInfoPayload(client);
                    await message.edit({ 
                        components: newPayload,
                        flags: [MessageFlags.IsComponentsV2] // 👈 KEEP FLAG ON UPDATE
                    });
                } catch (err) {
                    console.error(`[Session Auto-Update] Failed:`, err);
                }
            }, intervalTime);

            await interaction.editReply(`✅ **Setup Complete!**\nAuto-updating message active in ${targetChannel}.`);

        } catch (error) {
            console.error("CRITICAL ERROR in /servers-info:", error);
            await interaction.editReply({ 
                content: `❌ **An error occurred.**\nCheck your bot console for details.\nError: \`${error.message}\`` 
            });
        }
    },
};
