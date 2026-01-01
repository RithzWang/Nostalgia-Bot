const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ChannelType } = require('discord.js');
const ApplicationConfig = require('../../../src/models/ApplicationConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('application')
        .setDescription('Manage staff applications')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub => sub.setName('enable').setDescription('Open applications')
            .addChannelOption(opt => opt.setName('channel').setDescription('Apply button channel').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true))
            .addChannelOption(opt => opt.setName('log').setDescription('Log channel').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true))
            .addBooleanOption(opt => opt.setName('publish').setDescription('Publish?'))
        )
        .addSubcommand(sub => sub.setName('disable').setDescription('Close applications')),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        if (sub === 'enable') {
            try {
                // FETCH BOTH CHANNELS (The Fix)
                const appChannel = await interaction.guild.channels.fetch(interaction.options.getChannel('channel').id);
                const logChannel = await interaction.guild.channels.fetch(interaction.options.getChannel('log').id);
                const publish = interaction.options.getBoolean('publish') || false;

                if (!appChannel.viewable || !logChannel.viewable) return interaction.reply({ content: '<:no:1297814819105144862> I need permissions in those channels.', flags: MessageFlags.Ephemeral });

                const embed = new EmbedBuilder()
                    .setTitle('📝 Staff Applications Open')
                    .setDescription(`We are currently looking for dedicated members...\n\nClick the **"Apply Now"** button below.`)
                    .setColor(0x57F287);

                const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('app_apply_btn').setLabel('Apply Now').setStyle(ButtonStyle.Success).setEmoji('📩'));

                const msg = await appChannel.send({ embeds: [embed], components: [row] });
                if (publish && appChannel.type === ChannelType.GuildAnnouncement) await msg.crosspost();

                await ApplicationConfig.findOneAndUpdate(
                    { guildId: interaction.guild.id },
                    { guildId: interaction.guild.id, appChannelId: appChannel.id, logChannelId: logChannel.id, messageId: msg.id, enabled: true },
                    { upsert: true }
                );

                return interaction.reply({ content: `<:yes:1297814648417943565> System enabled in ${appChannel}.`, flags: MessageFlags.Ephemeral });
            } catch (e) {
                return interaction.reply({ content: `<:no:1297814819105144862> Error: ${e.message}`, flags: MessageFlags.Ephemeral });
            }
        } 
        else if (sub === 'disable') {
            const config = await ApplicationConfig.findOne({ guildId: interaction.guild.id });
            if (!config || !config.enabled) return interaction.reply({ content: '<:no:1297814819105144862> Not enabled.', flags: MessageFlags.Ephemeral });

            try {
                const channel = await interaction.guild.channels.fetch(config.appChannelId).catch(() => null);
                if (channel) {
                    const msg = await channel.messages.fetch(config.messageId).catch(() => null);
                    if (msg) {
                        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('app_apply_btn').setLabel('Closed').setStyle(ButtonStyle.Secondary).setDisabled(true));
                        const closedEmbed = EmbedBuilder.from(msg.embeds[0]).setTitle('📝 Staff Applications Closed').setColor(0xED4245);
                        await msg.edit({ embeds: [closedEmbed], components: [row] });
                    }
                }
            } catch (e) {}

            config.enabled = false;
            await config.save();
            return interaction.reply({ content: '<:yes:1297814648417943565> Disabled.', flags: MessageFlags.Ephemeral });
        }
    }
};
