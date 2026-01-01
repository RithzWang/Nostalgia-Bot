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
                        .setDescription('Where to send it?')
                        // ADDED ALL RELEVANT TEXT CHANNEL TYPES HERE
                        .addChannelTypes(
                            ChannelType.GuildText, 
                            ChannelType.GuildAnnouncement, 
                            ChannelType.PublicThread, 
                            ChannelType.PrivateThread, 
                            ChannelType.GuildVoice // Voice channels have text chat too!
                        )
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
                        .addChannelTypes(
                            ChannelType.GuildText, 
                            ChannelType.GuildAnnouncement, 
                            ChannelType.PublicThread, 
                            ChannelType.PrivateThread,
                            ChannelType.GuildVoice
                        )
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
        
        if (subcommand === 'create') {
            const title = interaction.options.getString('title');
            const description = interaction.options.getString('description');
            const color = interaction.options.getString('color') || '#888888';
            const publish = interaction.options.getBoolean('publish') || false;

            if (!title && !description) {
                return interaction.reply({
                    content: '❌ You must provide at least a Title or a Description!',
                    flags: MessageFlags.Ephemeral
                });
            }

            try {
                const embed = new EmbedBuilder().setColor(color);
                if (title) embed.setTitle(title);
                if (description) embed.setDescription(description);

                const sentMessage = await targetChannel.send({ embeds: [embed] });

                // AUTOMATICALLY PUBLISH IF IT'S AN ANNOUNCEMENT CHANNEL
                if (publish && targetChannel.type === ChannelType.GuildAnnouncement) {
                    await sentMessage.crosspost();
                }

                await interaction.reply({
                    content: `✅ Embed sent in ${targetChannel}${publish ? ' and published!' : '.'}`,
                    flags: MessageFlags.Ephemeral
                });

            } catch (error) {
                console.error(error);
                await interaction.reply({
                    content: `❌ Failed to send. Ensure I have "Send Messages" and "Embed Links" permissions in ${targetChannel}.`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }

        else if (subcommand === 'edit') {
            const messageId = interaction.options.getString('message_id');
            const newTitle = interaction.options.getString('title');
            const newDescription = interaction.options.getString('description');
            const newColor = interaction.options.getString('color');

            try {
                const messageToEdit = await targetChannel.messages.fetch(messageId);

                if (messageToEdit.author.id !== interaction.client.user.id) {
                    return interaction.reply({ content: `❌ I can only edit my own messages.`, flags: MessageFlags.Ephemeral });
                }

                const newEmbed = new EmbedBuilder(messageToEdit.embeds[0]?.data || {});
                if (newTitle) newEmbed.setTitle(newTitle);
                if (newDescription) newEmbed.setDescription(newDescription);
                if (newColor) newEmbed.setColor(newColor);

                await messageToEdit.edit({ embeds: [newEmbed] });

                await interaction.reply({
                    content: `✅ Edited embed in ${targetChannel}.`,
                    flags: MessageFlags.Ephemeral
                });

            } catch (error) {
                await interaction.reply({
                    content: `❌ Could not find message ID \`${messageId}\` in ${targetChannel}.`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    },
};
