const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ButtonBuilder, 
    ButtonStyle, 
    ActionRowBuilder,
    MessageFlags,
    ChannelType
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('buttonlink')
        .setDescription('Manage URL link buttons on messages')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        
        // --- SUBCOMMAND: ADD ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a button that opens a website')
                .addChannelOption(option => 
                    option.setName('channel')
                    .setDescription('The channel where the message is.')
                    .setRequired(true)
                    .addChannelTypes(
                        ChannelType.GuildText, 
                        ChannelType.GuildAnnouncement, 
                        ChannelType.PublicThread, 
                        ChannelType.PrivateThread, 
                        ChannelType.GuildVoice
                    ))
                .addStringOption(option => 
                    option.setName('message_id')
                    .setDescription('The ID of the message.')
                    .setRequired(true))
                .addStringOption(option => 
                    option.setName('label')
                    .setDescription('The text on the button.')
                    .setRequired(true))
                .addStringOption(option => 
                    option.setName('url')
                    .setDescription('The website link (Must start with http:// or https://).')
                    .setRequired(true))
                .addStringOption(option => 
                    option.setName('emoji')
                    .setDescription('Optional emoji.')
                    .setRequired(false)))

        // --- SUBCOMMAND: REMOVE ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a link button from a message')
                .addChannelOption(option => 
                    option.setName('channel')
                    .setDescription('The channel where the message is.')
                    .setRequired(true)
                    .addChannelTypes(
                        ChannelType.GuildText, 
                        ChannelType.GuildAnnouncement, 
                        ChannelType.PublicThread, 
                        ChannelType.PrivateThread, 
                        ChannelType.GuildVoice
                    ))
                .addStringOption(option => 
                    option.setName('message_id')
                    .setDescription('The ID of the message.')
                    .setRequired(true))
                .addStringOption(option => 
                    option.setName('label')
                    .setDescription('The EXACT text of the button you want to remove.')
                    .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const channel = interaction.options.getChannel('channel');
        const messageId = interaction.options.getString('message_id');

        let message;
        try {
            message = await channel.messages.fetch(messageId);
            if (!message) throw new Error('Message not found');
        } catch (error) {
            return interaction.reply({ 
                content: `<:no:1297814819105144862> Could not find that message in ${channel}. Check the ID.`, 
                flags: MessageFlags.Ephemeral 
            });
        }

        // ==========================================
        // LOGIC: ADD LINK BUTTON
        // ==========================================
        if (subcommand === 'add') {
            const label = interaction.options.getString('label');
            const url = interaction.options.getString('url');
            const emoji = interaction.options.getString('emoji');

            // URL Validation
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                return interaction.reply({ 
                    content: '<:no:1297814819105144862> Invalid URL! It must start with `http://` or `https://`.', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            try {
                const button = new ButtonBuilder()
                    .setLabel(label)
                    .setURL(url)
                    .setStyle(ButtonStyle.Link); // URL buttons MUST be Link style

                if (emoji) button.setEmoji(emoji);

                // Reconstruct existing rows
                let components = message.components.map(c => ActionRowBuilder.from(c));

                // Try to find space in existing rows
                let added = false;
                for (let row of components) {
                    if (row.components.length < 5) {
                        row.addComponents(button);
                        added = true;
                        break;
                    }
                }

                // If no space, add a new row
                if (!added) {
                    if (components.length >= 5) {
                        return interaction.reply({ 
                            content: '<:no:1297814819105144862> This message has too many buttons (Max 5 rows).', 
                            flags: MessageFlags.Ephemeral 
                        });
                    }
                    const newRow = new ActionRowBuilder().addComponents(button);
                    components.push(newRow);
                }

                await message.edit({ components: components });

                await interaction.reply({ 
                    content: `<:yes:1297814648417943565> Added link button **"${label}"** pointing to \`${url}\`.`, 
                    flags: MessageFlags.Ephemeral 
                });

            } catch (error) {
                console.error(error);
                await interaction.reply({ content: `<:no:1297814819105144862> Error: ${error.message}`, flags: MessageFlags.Ephemeral });
            }
        
        // ==========================================
        // LOGIC: REMOVE LINK BUTTON
        // ==========================================
        } else if (subcommand === 'remove') {
            const labelToRemove = interaction.options.getString('label');

            try {
                let found = false;

                const newComponents = message.components.map(row => {
                    const newRow = ActionRowBuilder.from(row);
                    const filteredComponents = newRow.components.filter(component => {
                        // Check if the Label matches
                        if (component.data.label === labelToRemove && component.data.style === ButtonStyle.Link) {
                            found = true;
                            return false; // Remove it
                        }
                        return true; // Keep it
                    });
                    newRow.setComponents(filteredComponents);
                    return newRow;
                }).filter(row => row.components.length > 0); // Remove empty rows

                if (!found) {
                    return interaction.reply({ 
                        content: `<:no:1297814819105144862> I couldn't find a link button labeled **"${labelToRemove}"** on that message.`, 
                        flags: MessageFlags.Ephemeral 
                    });
                }

                await message.edit({ components: newComponents });

                await interaction.reply({ 
                    content: `<:yes:1297814648417943565> Removed the button **"${labelToRemove}"**.`, 
                    flags: MessageFlags.Ephemeral 
                });

            } catch (error) {
                console.error(error);
                await interaction.reply({ content: `<:no:1297814819105144862> Error: ${error.message}`, flags: MessageFlags.Ephemeral });
            }
        }
    }
};
