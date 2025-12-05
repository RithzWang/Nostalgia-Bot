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
                .setDescription('Send a new embed message')
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('The title of the embed')
                )
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('The main text of the embed')
                )
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('Hex color (e.g. #FF0000). Default is #888888')
                )
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Where to send it? (Empty = Here)')
                        .addChannelTypes(ChannelType.GuildText)
                )
        )

        // ==========================
        // SUBCOMMAND: EDIT
        // ==========================
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Edit an existing embed')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('The ID of the message to edit')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('New title (Leave empty to keep current)')
                )
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('New description (Leave empty to keep current)')
                )
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('New color (Leave empty to keep current)')
                )
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Where is the message? (Empty = Here)')
                        .addChannelTypes(ChannelType.GuildText)
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

            // Validation: Ensure at least Title or Description is provided
            if (!title && !description) {
                return interaction.reply({
                    content: '❌ You must provide at least a Title or a Description!',
                    flags: MessageFlags.Ephemeral
                });
            }

            try {
                const embed = new EmbedBuilder()
                    .setColor(color);
                
                if (title) embed.setTitle(title);
                if (description) embed.setDescription(description);

                await targetChannel.send({ embeds: [embed] });

                await interaction.reply({
                    content: `✅ Embed created in ${targetChannel}`,
                    flags: MessageFlags.Ephemeral
                });

            } catch (error) {
                console.error(error);
                await interaction.reply({
                    content: `❌ Failed to send embed. Check color format (use #Hex) or permissions.`,
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
                // 1. Fetch the message
                const messageToEdit = await targetChannel.messages.fetch(messageId);

                // 2. Validate ownership and content
                if (messageToEdit.author.id !== interaction.client.user.id) {
                    return interaction.reply({
                        content: `❌ I can only edit my own messages.`,
                        flags: MessageFlags.Ephemeral
                    });
                }
                if (messageToEdit.embeds.length === 0) {
                    return interaction.reply({
                        content: `❌ That message doesn't have an embed to edit.`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                // 3. Get existing embed and modify it
                const existingEmbed = messageToEdit.embeds[0];
                const newEmbed = new EmbedBuilder(existingEmbed.data); // Copy old data

                // Only update fields if the user provided something new
                if (newTitle) newEmbed.setTitle(newTitle);
                if (newDescription) newEmbed.setDescription(newDescription);
                if (newColor) newEmbed.setColor(newColor);

                // 4. Update the message
                await messageToEdit.edit({ embeds: [newEmbed] });

                await interaction.reply({
                    content: `✅ Embed updated successfully in ${targetChannel}.`,
                    flags: MessageFlags.Ephemeral
                });

            } catch (error) {
                console.error(error);
                await interaction.reply({
                    content: `❌ Could not find message with ID \`${messageId}\` in ${targetChannel}.`,
                    flags: MessageFlags.Ephemeral
                });
            }
        }
    },
};
