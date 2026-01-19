const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ContainerBuilder, TextDisplayBuilder } = require('discord.js');
const ServerInfoSchema = require('../../../src/models/ServerInfoSchema'); 
const { generateServerInfoPayload } = require('../../../utils/serverInfoUtils');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('servers-info')
        .setDescription('Setup the live server info display')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option => 
            option.setName('message_id')
                .setDescription('ID of the message to convert (Optional)')
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

        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
        const targetMessageId = interaction.options.getString('message_id');
        const client = interaction.client;

        try {
            // 1. Generate the Server Info Data
            const finalPayload = await generateServerInfoPayload(client);
            let message;

            if (targetMessageId) {
                // --- CONVERSION LOGIC ---
                try {
                    message = await targetChannel.messages.fetch(targetMessageId);

                    if (message.author.id !== client.user.id) {
                        return interaction.editReply(`❌ **I cannot edit that message.** It belongs to ${message.author.username}, not me.`);
                    }

                    // A. Create Temporary "Loading" Container
                    // This is the trick: We send a valid Container to force the "V2" switch.
                    const loadingContainer = new ContainerBuilder()
                        .setAccentColor(0xFEE75C) // Yellow
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent('### 🔄 Converting to Server Info Panel...')
                        );

                    // B. FORCE CONVERT (Wipe Text -> Set V2 Flag)
                    await message.edit({
                        content: '',             // 🗑️ Clear Plain Text
                        embeds: [],              // 🗑️ Clear Embeds
                        files: [],               // 🗑️ Clear Attachments
                        components: [loadingContainer], 
                        flags: MessageFlags.IsComponentsV2 // 🚩 Force Container Mode
                    });

                    // Wait 1 second to let Discord process the type change (Safety buffer)
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    // C. Apply Final Server Info
                    await message.edit({ 
                        components: finalPayload,
                        flags: MessageFlags.IsComponentsV2 
                    });

                } catch (e) {
                    console.error("Conversion Error:", e);
                    return interaction.editReply({ 
                        content: `❌ **Conversion Failed!**\n\n` + 
                                 `I found message \`${targetMessageId}\` but couldn't convert it.\n` + 
                                 `Error: \`${e.message}\`` 
                    });
                }
            } else {
                // --- SEND NEW (Standard) ---
                message = await targetChannel.send({ 
                    components: finalPayload,
                    flags: [MessageFlags.IsComponentsV2]
                });
            }

            // 2. Save to Database
            await ServerInfoSchema.findOneAndUpdate(
                { guildId: interaction.guild.id }, 
                { 
                    guildId: interaction.guild.id,
                    channelId: targetChannel.id,
                    messageId: message.id 
                },
                { upsert: true, new: true }
            );

            // 3. Start Auto-Update Interval
            setInterval(async () => {
                try {
                    const newPayload = await generateServerInfoPayload(client);
                    await message.edit({ 
                        components: newPayload,
                        flags: [MessageFlags.IsComponentsV2]
                    });
                } catch (err) {
                    console.error(`[Auto-Update] Failed:`, err);
                }
            }, 5 * 60 * 1000);

            await interaction.editReply(`✅ **Success!**\nServer Info Panel active in ${targetChannel}.\n(Converted ID: ${message.id})`);

        } catch (error) {
            console.error("CRITICAL ERROR:", error);
            await interaction.editReply(`❌ **Crash:** ${error.message}`);
        }
    },
};
