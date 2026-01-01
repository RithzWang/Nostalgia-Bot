const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    MessageFlags,
    ChannelType
} = require('discord.js');

const ApplicationConfig = require('../../../src/models/ApplicationConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('application')
        .setDescription('Manage staff applications')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        // 1. ENABLE
        .addSubcommand(sub =>
            sub.setName('enable')
                .setDescription('Open applications')
                .addChannelOption(opt => 
                    opt.setName('channel')
                        .setDescription('Where to post the Apply button')
                        .addChannelTypes(
                            ChannelType.GuildText, 
                            ChannelType.GuildAnnouncement, 
                            ChannelType.PublicThread, 
                            ChannelType.PrivateThread, 
                            ChannelType.GuildVoice
                        )
                        .setRequired(true)
                )
                .addChannelOption(opt => 
                    opt.setName('log')
                        .setDescription('Where to send filled forms')
                        .addChannelTypes(
                            ChannelType.GuildText, 
                            ChannelType.GuildAnnouncement, 
                            ChannelType.PublicThread, 
                            ChannelType.PrivateThread, 
                            ChannelType.GuildVoice
                        )
                        .setRequired(true)
                )
                .addBooleanOption(opt => opt.setName('publish').setDescription('Publish the application message? (Announcements only)'))
        )
        // 2. DISABLE
        .addSubcommand(sub =>
            sub.setName('disable')
                .setDescription('Close applications and disable the button')
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        // --- ENABLE ---
        if (sub === 'enable') {
            const appChannel = interaction.options.getChannel('channel');
            const logChannel = interaction.options.getChannel('log');
            const publish = interaction.options.getBoolean('publish') || false;

            // Check bot permissions in target channels
            if (!appChannel.viewable || !logChannel.viewable) {
                return interaction.reply({ 
                    content: '<:no:1297814819105144862> I need permission to see/send in those channels.', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            // 1. Create the Embed
            const embed = new EmbedBuilder()
                .setTitle('📝 Staff Applications Open')
                .setDescription(`We are currently looking for dedicated members to join our staff team! If you are passionate about this community and want to help keep it safe and fun, please apply below.

**Requirements:**
• Must be active on the server.
• Must be able to handle stressful situations calmly.
• Must have a clean moderation history.
• Must be willing to work as a team.

Click the **"Apply Now"** button below to start your application.`)
                .setColor(0x57F287); // Green

            const btn = new ButtonBuilder()
                .setCustomId('app_apply_btn')
                .setLabel('Apply Now')
                .setStyle(ButtonStyle.Success)
                .setEmoji('📩');

            const row = new ActionRowBuilder().addComponents(btn);

            try {
                // 2. Send Message
                const msg = await appChannel.send({ embeds: [embed], components: [row] });

                // 3. Auto-Publish Logic
                if (publish && appChannel.type === ChannelType.GuildAnnouncement) {
                    await msg.crosspost();
                }

                // 4. Save to DB
                await ApplicationConfig.findOneAndUpdate(
                    { guildId: interaction.guild.id },
                    { 
                        guildId: interaction.guild.id,
                        appChannelId: appChannel.id,
                        logChannelId: logChannel.id,
                        messageId: msg.id,
                        enabled: true
                    },
                    { upsert: true }
                );

                return interaction.reply({ 
                    content: `<:yes:1297814648417943565> Applications opened in ${appChannel}${publish ? ' (Published)' : ''} and logs set to ${logChannel}.`, 
                    flags: MessageFlags.Ephemeral 
                });

            } catch (error) {
                console.error(error);
                return interaction.reply({ 
                    content: '<:no:1297814819105144862> Failed to setup application system. Check my permissions.', 
                    flags: MessageFlags.Ephemeral 
                });
            }
        }

        // --- DISABLE ---
        else if (sub === 'disable') {
            const config = await ApplicationConfig.findOne({ guildId: interaction.guild.id });

            if (!config || !config.enabled) {
                return interaction.reply({ 
                    content: '<:no:1297814819105144862> Applications are already disabled or not set up.', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            // 1. Try to find the old message and edit it to "Closed"
            try {
                const channel = interaction.guild.channels.cache.get(config.appChannelId);
                if (channel) {
                    const msg = await channel.messages.fetch(config.messageId);
                    if (msg) {
                        const disabledBtn = new ButtonBuilder()
                            .setCustomId('app_apply_btn')
                            .setLabel('Applications Closed')
                            .setStyle(ButtonStyle.Secondary) // Grey
                            .setDisabled(true); // LOCK IT

                        const row = new ActionRowBuilder().addComponents(disabledBtn);
                        
                        const closedEmbed = EmbedBuilder.from(msg.embeds[0])
                            .setTitle('📝 Staff Applications Closed')
                            .setDescription('Applications are currently closed. Thank you for your interest.')
                            .setColor(0xED4245); // Red

                        await msg.edit({ embeds: [closedEmbed], components: [row] });
                    }
                }
            } catch (e) {
                console.log("Could not edit application message (maybe deleted):", e);
            }

            // 2. Update DB
            config.enabled = false;
            // We usually keep the log channel in DB in case you re-enable, but setting it to null is fine if that's your preference
            // config.logChannelId = null; 
            await config.save();

            return interaction.reply({ 
                content: '<:yes:1297814648417943565> Applications disabled.', 
                flags: MessageFlags.Ephemeral 
            });
        }
    }
};
