const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    MessageFlags, 
    ChannelType,
    // Imports required for the layout
    ContainerBuilder, 
    TextDisplayBuilder, 
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SectionBuilder
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('replace')
        .setDescription('Manage message types')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        
        // --- SUBCOMMAND 1: TO CONTAINER ---
        .addSubcommand(sub => 
            sub.setName('to_container')
                .setDescription('Replace a normal message with the Server Info Layout')
                .addStringOption(option => 
                    option.setName('message_id')
                        .setDescription('The ID of the message to edit')
                        .setRequired(true))
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('The channel where the message is')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
        )

        // --- SUBCOMMAND 2: TO MESSAGE ---
        .addSubcommand(sub => 
            sub.setName('to_message')
                .setDescription('Revert a Container back to a normal text message')
                .addStringOption(option => 
                    option.setName('message_id')
                        .setDescription('The ID of the container message to edit')
                        .setRequired(true))
                .addStringOption(option => 
                    option.setName('content')
                        .setDescription('The new text content for the message')
                        .setRequired(true))
                .addChannelOption(option => 
                    option.setName('channel')
                        .setDescription('The channel where the message is')
                        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const subcommand = interaction.options.getSubcommand();
        const messageId = interaction.options.getString('message_id');
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        try {
            const targetMessage = await channel.messages.fetch(messageId);

            if (targetMessage.author.id !== interaction.client.user.id) {
                return interaction.editReply({ content: '<:no:1297814819105144862> I can only edit my own messages.' });
            }

            // ====================================================
            // LOGIC SPLIT
            // ====================================================

            if (subcommand === 'to_container') {
                // --- INSTANT UPDATE (No Loading) ---
                
                // Define the Server Info Layout Components
                const serverInfoComponents = [
                    new ContainerBuilder()
                        .addMediaGalleryComponents(
                            new MediaGalleryBuilder()
                                .addItems(
                                    new MediaGalleryItemBuilder()
                                        .setURL("https://cdn.discordapp.com/attachments/853503167706693632/1466977972685766851/Untitled102_20260131090625.png?ex=697eb533&is=697d63b3&hm=35eae67ed2b85b0bdc3126cdbf571d29ee66149ce9f68af5c9c5c64c187573fc&"),
                                ),
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true),
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("# <:A2Q_1:1466981218758426634><:A2Q_2:1466981281060360232> » Information"),
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false),
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("> We’re a community server built for people who love to game, talk, and just have a good time. From chill voice chats to lively text convos, there’s always something going on.\n> \n> Our goal is to keep things safe, fun, and friendly — a place where everyone can relax, share moments, and enjoy being part of something good."),
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false),
                        ),
                    new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("# <:A2Q_1:1466981218758426634><:A2Q_2:1466981281060360232> » Rules"),
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false),
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("1. Be friendly to each other, we want to keep the chat respectful, although we do joke around quite a lot, it’s important to stay respectful!\n\n2. Keep Racism & Bad Behaviour out of the chat!\n\n3. No Spamming.\n\nIf you notice any inappropriate behaviour or rule-breaking, do not hesitate to inform **Moderator**.\n\n```ansi\n\u001b[2;31mRule violations will lead to appropriate punishment.\u001b[0m\n```"),
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false),
                        ),
                    new ContainerBuilder()
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("# <:A2Q_1:1466981218758426634><:A2Q_2:1466981281060360232> » Leadership"),
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false),
                        )
                        .addSectionComponents(
                            new SectionBuilder()
                                .setButtonAccessory(
                                    new ButtonBuilder()
                                        .setStyle(ButtonStyle.Link)
                                        .setLabel("View Profile")
                                        .setURL("https://discord.com/users/837741275603009626")
                                )
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent("### <:owner:1466994441691857063> Owner\n**Name:** Ridouan <:qahtani_1:1463886050270118055><:qahtani_2:1463886211343974462><:qahtani_3:1463886253098537035>\n**ID:** `837741275603009626`"),
                                ),
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false),
                        )
                        .addSectionComponents(
                            new SectionBuilder()
                                .setButtonAccessory(
                                    new ButtonBuilder()
                                        .setStyle(ButtonStyle.Link)
                                        .setLabel("View Profile")
                                        .setURL("https://discord.com/users/1448029716262027418")
                                )
                                .addTextDisplayComponents(
                                    new TextDisplayBuilder().setContent("### <:co_owner:1466994498268696627> Co-owner\n**Name:** Aboudi <:qahtani_1:1463886050270118055><:qahtani_2:1463886211343974462><:qahtani_3:1463886253098537035>\n**ID:** `1448029716262027418`"),
                                ),
                        )
                        .addSeparatorComponents(
                            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true),
                        )
                        .addMediaGalleryComponents(
                            new MediaGalleryBuilder()
                                .addItems(
                                    new MediaGalleryItemBuilder()
                                        .setURL("https://cdn.discordapp.com/attachments/853503167706693632/1467103035384795177/Untitled102_20260131172324.png?ex=697f29ad&is=697dd82d&hm=3c8f8bff99e23298251d8399cf22e8edfe9c3734a4e85bc4e8994097edddab48&"),
                                ),
                        ),
                ];

                // Direct Edit
                await targetMessage.edit({
                    content: '', // Clear old content
                    embeds: [],  // Clear old embeds
                    files: [],   // Clear old files
                    components: serverInfoComponents,
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: [] } // Don't ping anyone
                });

                return interaction.editReply({ content: `<:yes:1297814648417943565> Message replaced with **Server Info Layout**!` });
            } 
            
            else if (subcommand === 'to_message') {
                // --- DIRECT REVERT ---
                
                const newContent = interaction.options.getString('content');

                await targetMessage.edit({
                    content: newContent,
                    components: [], // Clear components
                    embeds: [],     // Clear embeds
                    files: [],      // Clear attachments
                    flags: 0,       // 0 Removes "IsComponentsV2" flag
                    allowedMentions: { parse: [] } // Don't ping anyone if content has @everyone
                });

                return interaction.editReply({ content: `<:yes:1297814648417943565> Container reverted to **Normal Message**!` });
            }

        } catch (error) {
            console.error(error);
            const errorMsg = `<:no:1297814819105144862> Error: ${error.message}`;
            return interaction.editReply({ content: errorMsg });
        }
    }
};
