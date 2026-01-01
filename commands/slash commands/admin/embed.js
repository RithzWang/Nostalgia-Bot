const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Create and edit embed messages')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        // ==========================
        // SUBCOMMAND: CREATE
        // ==========================
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a message embed')
                .addStringOption(option => option.setName('title').setDescription('The title of the embed'))
                .addStringOption(option => option.setName('description').setDescription('The description of the embed'))
                .addStringOption(option => option.setName('color').setDescription('Hex color (e.g. #FF0000)'))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Where to send/edit it?')
                        .addChannelTypes(
                            ChannelType.GuildText, 
                            ChannelType.GuildAnnouncement, 
                            ChannelType.PublicThread, 
                            ChannelType.PrivateThread, 
                            ChannelType.GuildVoice
                        )
                )
                .addStringOption(option => 
                    option.setName('message_id')
                        .setDescription('OPTIONAL: Attach this embed to an existing bot message instead of sending new')
                )
                .addBooleanOption(option => 
                    option.setName('publish')
                        .setDescription('Automatically publish if sent to an Announcement channel?')
                )
        )

        // ==========================
        // SUBCOMMAND: EDIT
        // ==========================
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit an existing embed')
                .addStringOption(option => option.setName('message_id').setDescription('ID of the message').setRequired(true))
                .addStringOption(option => option.setName('title').setDescription('New title'))
                .addStringOption(option => option.setName('description').setDescription('New description'))
                .addStringOption(option => option.setName('color').setDescription('New color'))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Which channel is the message in?')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.PublicThread, ChannelType.PrivateThread, ChannelType.GuildVoice)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
        
        // ==========================
        // LOGIC: CREATE
        // ==========================
        if (subcommand === 'create') {
            const title = interaction.options.getString('title');
            const description = interaction.options.getString('description');
            const color = interaction.options.getString('color') || '#888888';
            const publish = interaction.options.getBoolean('publish') || false;
            const reuseMessageId = interaction.options.getString('message_id');

            if (!title && !description) {
                return interaction.reply({
                    content: '<:no:1297814819105144862> You must provide at least a Title or a Description!',
                    flags: MessageFlags.Ephemeral
                });
            }

            try {
                const embed = new EmbedBuilder().setColor(color);
                if (title) embed.setTitle(title);
                if (description) embed.setDescription(description);

                // --- OPTION A: REUSE EXISTING MESSAGE ---
                if (reuseMessageId) {
                    const messageToReuse = await targetChannel.messages.fetch(reuseMessageId);

                    if (!messageToReuse) {
                         return interaction.reply({ content: `<:no:1297814819105144862> Could not find message ${reuseMessageId} in ${targetChannel}.`, flags: MessageFlags.Ephemeral });
                    }
                    if (messageToReuse.author.id !== interaction.client.user.id) {
                         return interaction.reply({ content: `<:no:1297814819105144862> I can only attach embeds to **my own** messages.`, flags: MessageFlags.Ephemeral });
                    }

                    // 1. Attach Embed immediately (keeping old content for now)
                    await messageToReuse.edit({ embeds: [embed] });

                    // 2. Wait 3 seconds, then remove the text content
                    setTimeout(async () => {
                        try {
                            await messageToReuse.edit({ content: null });
                        } catch (e) {
                            console.error("Failed to clear content:", e);
                        }
                    }, 3000);

                    await interaction.reply({
                        content: `<:yes:1297814648417943565> Attached embed to message! Old text will vanish in 3s.`,
                        flags: MessageFlags.Ephemeral
                    });

                } 
                // --- OPTION B: SEND NEW MESSAGE ---
                else {
                    const sentMessage = await targetChannel.send({ embeds: [embed] });

                    if (publish && targetChannel.type === ChannelType.GuildAnnouncement) {
                        await sentMessage.crosspost();
                    }

                    await interaction.reply({
                        content: `<:yes:1297814648417943565> Embed sent in ${targetChannel}${publish ? ' and published!' : '.'}`,
                        flags: MessageFlags.Ephemeral
                    });
                }

            } catch (error) {
                console.error(error);
                await interaction.reply({
                    content: `<:no:1297814819105144862> Failed. Ensure I have permissions or valid Message ID.`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        // ==========================
        // LOGIC: EDIT
        // ==========================
        else if (subcommand === 'edit') {
            const messageId = interaction.options.getString('message_id');
            const newTitle = interaction.options.getString('title');
            const newDescription = interaction.options.getString('description');
            const newColor = interaction.options.getString('color');

            try {
                const messageToEdit = await targetChannel.messages.fetch(messageId);

                if (messageToEdit.author.id !== interaction.client.user.id) {
                    return interaction.reply({ content: `<:no:1297814819105144862> I can only edit my own messages.`, flags: MessageFlags.Ephemeral });
                }

                const newEmbed = new EmbedBuilder(messageToEdit.embeds[0]?.data || {});
                if (newTitle) newEmbed.setTitle(newTitle);
                if (newDescription) newEmbed.setDescription(newDescription);
                if (newColor) newEmbed.setColor(newColor);

                await messageToEdit.edit({ embeds: [newEmbed] });

                await interaction.reply({
                    content: `<:yes:1297814648417943565> Edited embed in ${targetChannel}.`,
                    flags: MessageFlags.Ephemeral
                });

            } catch (error) {
                await interaction.reply({
                    content: `<:no:1297814819105144862> Could not find message ID \`${messageId}\` in ${targetChannel}.`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    },
};
