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
                .setDescription('The ID of the existing message (OPTIONAL)')
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel where the message is (REQUIRED if using ID)')
                .setRequired(false)),

    async execute(interaction) {
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({ content: '❌ Admin only.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        // Default to current channel if none provided
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
        const targetMessageId = interaction.options.getString('message_id');
        const client = interaction.client;

        try {
            const payloadComponents = await generateServerInfoPayload(client);
            let message;

            if (targetMessageId) {
                // --- ATTEMPT TO EDIT ---
                try {
                    // 1. Try to fetch the message from the SPECIFIED channel
                    message = await targetChannel.messages.fetch(targetMessageId);
                    
                    // 2. If successful, edit it
                    await message.edit({ 
                        components: payloadComponents,
                        flags: [MessageFlags.IsComponentsV2] 
                    });

                } catch (e) {
                    console.error("Fetch Error:", e);
                    
                    // --- SMART ERROR MESSAGE ---
                    // This explains exactly WHY it failed (usually ID vs Channel mismatch)
                    return interaction.editReply({ 
                        content: `❌ **Could not find that message!**\n\n` + 
                                 `**Are you sure Message \`${targetMessageId}\` is inside ${targetChannel}?**\n` + 
                                 `- Bots cannot search the whole server. You must select the correct channel in the command options.\n` + 
                                 `- If the message is in a different channel, run the command again and select that channel in the \`channel\` option.` 
                    });
                }
            } else {
                // --- SEND NEW ---
                message = await targetChannel.send({ 
                    components: payloadComponents,
                    flags: [MessageFlags.IsComponentsV2]
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
            setInterval(async () => {
                try {
                    const newPayload = await generateServerInfoPayload(client);
                    await message.edit({ 
                        components: newPayload,
                        flags: [MessageFlags.IsComponentsV2]
                    });
                } catch (err) {
                    console.error(`[Session Auto-Update] Failed:`, err);
                }
            }, 5 * 60 * 1000);

            await interaction.editReply(`✅ **Success!**\nLinked to message in ${targetChannel}.\nI will auto-update this every 5 minutes.`);

        } catch (error) {
            console.error("CRITICAL ERROR:", error);
            await interaction.editReply({ 
                content: `❌ **Crash Error:** \`${error.message}\`\nCheck console for details.` 
            });
        }
    },
};
