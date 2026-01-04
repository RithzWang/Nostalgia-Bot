const { SlashCommandBuilder, PermissionFlagsBits, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buttonlink')
        .setDescription('Manage URL buttons')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub => sub.setName('add').setDescription('Add URL button')
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true))
            .addStringOption(opt => opt.setName('message_id').setDescription('Message ID').setRequired(true))
            .addStringOption(opt => opt.setName('label').setDescription('Text').setRequired(true))
            .addStringOption(opt => opt.setName('url').setDescription('URL (http/https)').setRequired(true))
            .addStringOption(opt => opt.setName('emoji').setDescription('Emoji'))
        )
        .addSubcommand(sub => sub.setName('remove').setDescription('Remove button')
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true))
            .addStringOption(opt => opt.setName('message_id').setDescription('Message ID').setRequired(true))
            .addStringOption(opt => opt.setName('label').setDescription('Exact Text').setRequired(true))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        // FETCH CHANNEL FIX
        let channel = await interaction.guild.channels.fetch(interaction.options.getChannel('channel').id);
        const messageId = interaction.options.getString('message_id');

        let message;
        try {
            message = await channel.messages.fetch(messageId);
        } catch (error) {
            return interaction.reply({ content: `<:no:1297814819105144862> Could not find message in ${channel}.`, flags: MessageFlags.Ephemeral });
        }

        if (sub === 'add') {
            const label = interaction.options.getString('label');
            const url = interaction.options.getString('url');
            const emoji = interaction.options.getString('emoji');

            if (!url.startsWith('http')) return interaction.reply({ content: '<:no:1297814819105144862> Invalid URL.', flags: MessageFlags.Ephemeral });

            const button = new ButtonBuilder().setLabel(label).setURL(url).setStyle(ButtonStyle.Link);
            if (emoji) button.setEmoji(emoji);

            let components = message.components.map(c => ActionRowBuilder.from(c));
            let added = false;

            for (let row of components) {
                if (row.components.length < 5) { row.addComponents(button); added = true; break; }
            }
            if (!added) {
                if (components.length >= 5) return interaction.reply({ content: '<:no:1297814819105144862> Too many rows.', flags: MessageFlags.Ephemeral });
                components.push(new ActionRowBuilder().addComponents(button));
            }

            await message.edit({ components });
            return interaction.reply({ content: `<:yes:1297814648417943565> Added link button!`, flags: MessageFlags.Ephemeral });
        } 
        else if (sub === 'remove') {
            const label = interaction.options.getString('label');
            let found = false;

            const newComponents = message.components.map(row => {
                const newRow = ActionRowBuilder.from(row);
                const filtered = newRow.components.filter(c => {
                    if (c.data.label === label && c.data.style === ButtonStyle.Link) { found = true; return false; }
                    return true;
                });
                newRow.setComponents(filtered);
                return newRow;
            }).filter(row => row.components.length > 0);

            if (!found) return interaction.reply({ content: `<:no:1297814819105144862> Link button not found.`, flags: MessageFlags.Ephemeral });
            
            await message.edit({ components: newComponents });
            return interaction.reply({ content: `<:yes:1297814648417943565> Removed button.`, flags: MessageFlags.Ephemeral });
        }
    }
};
