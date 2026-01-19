const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

// ==========================================
// 🆕 UPDATED RELATIVE PATHS
// ==========================================
// Go up 3 folders -> src/models/
const ServerInfoSchema = require('../../../src/models/ServerInfoSchema'); 
// Go up 3 folders -> utils/
const { generateServerInfoPayload } = require('../../../utils/serverInfoUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('servers-info')
        .setDescription('Setup the live server info display')
        // Lock to Admins Only
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option => 
            option.setName('message_id')
                .setDescription('The ID of an existing message to convert (optional)')
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to send/find the message (optional)')
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
            // 1. Create the payload
            const payloadComponents = await generateServerInfoPayload(client);
            let message;

            // 2. Edit existing OR Send new
            if (targetMessageId) {
                try {
                    message = await targetChannel.messages.fetch(targetMessageId);
                    await message.edit({ components: payloadComponents });
                } catch (e) {
                    return interaction.editReply(`❌ Could not find message ID ${targetMessageId} in ${targetChannel}.`);
                }
            } else {
                message = await targetChannel.send({ components: payloadComponents });
            }

            // 3. Save to Database
            await ServerInfoSchema.findOneAndUpdate(
                { guildId: interaction.guild.id }, 
                { 
                    guildId: interaction.guild.id,
                    channelId: targetChannel.id,
                    messageId: message.id 
                },
                { upsert: true, new: true }
            );

            // 4. Start the interval for this session immediately
            const intervalTime = 5 * 60 * 1000; // 5 mins
            setInterval(async () => {
                try {
                    const newPayload = await generateServerInfoPayload(client);
                    await message.edit({ components: newPayload });
                } catch (err) {
                    console.error(`[Session Auto-Update] Failed:`, err);
                }
            }, intervalTime);

            await interaction.editReply(`✅ **Setup Complete!**\nAuto-updating message created in ${targetChannel}.\nI have saved this to the database, so it will resume even if I restart.`);

        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ An error occurred while setting up the info.');
        }
    },
};
