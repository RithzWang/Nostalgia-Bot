const { SlashCommandBuilder, PermissionFlagsBits, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buttonrole')
        .setDescription('Manage role buttons')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub => sub.setName('add').setDescription('Add button')
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true))
            .addStringOption(opt => opt.setName('message_id').setDescription('Message ID').setRequired(true))
            .addStringOption(opt => opt.setName('text').setDescription('Button Text').setRequired(true))
            .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))
            .addStringOption(opt => opt.setName('colour').setDescription('Colour').setRequired(true).addChoices({ name: 'Blue', value: 'Primary' }, { name: 'Grey', value: 'Secondary' }, { name: 'Green', value: 'Success' }, { name: 'Red', value: 'Danger' }))
            .addBooleanOption(opt => opt.setName('verify').setDescription('Verify Mode?').setRequired(true))
            .addStringOption(opt => opt.setName('emoji').setDescription('Emoji'))
        )
        .addSubcommand(sub => sub.setName('remove').setDescription('Remove button')
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(true))
            .addStringOption(opt => opt.setName('message_id').setDescription('Message ID').setRequired(true))
            .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        // FETCH CHANNEL FIX
        let channel = await interaction.guild.channels.fetch(interaction.options.getChannel('channel').id);
        const messageId = interaction.options.getString('message_id');
        const role = interaction.options.getRole('role');

        let message;
        try {
            message = await channel.messages.fetch(messageId);
        } catch (error) {
            return interaction.reply({ content: `<:no:1297814819105144862> Could not find message in ${channel}.`, flags: MessageFlags.Ephemeral });
        }

        if (sub === 'add') {
            const text = interaction.options.getString('text');
            const colorStr = interaction.options.getString('colour');
            const emoji = interaction.options.getString('emoji');
            const isVerify = interaction.options.getBoolean('verify');

            const styleMap = { 'Primary': ButtonStyle.Primary, 'Secondary': ButtonStyle.Secondary, 'Success': ButtonStyle.Success, 'Danger': ButtonStyle.Danger };
            const button = new ButtonBuilder().setCustomId(`role_${role.id}_${isVerify ? '1' : '0'}`).setLabel(text).setStyle(styleMap[colorStr]);
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
            return interaction.reply({ content: `<:yes:1297814648417943565> Added button for **${role.name}**!`, flags: MessageFlags.Ephemeral });
        } 
        else if (sub === 'remove') {
            const targetPrefix = `role_${role.id}`;
            let found = false;

            const newComponents = message.components.map(row => {
                const newRow = ActionRowBuilder.from(row);
                const filtered = newRow.components.filter(c => {
                    if (c.data.custom_id?.startsWith(targetPrefix)) { found = true; return false; }
                    return true;
                });
                newRow.setComponents(filtered);
                return newRow;
            }).filter(row => row.components.length > 0);

            if (!found) return interaction.reply({ content: `<:no:1297814819105144862> Button not found.`, flags: MessageFlags.Ephemeral });
            
            await message.edit({ components: newComponents });
            return interaction.reply({ content: `<:yes:1297814648417943565> Removed button.`, flags: MessageFlags.Ephemeral });
        }
    }
};
