const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    MessageFlags,
    MediaGalleryBuilder, 
    MediaGalleryItemBuilder, 
    SeparatorBuilder, 
    SeparatorSpacingSize, 
    TextDisplayBuilder, 
    ContainerBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    SectionBuilder 
} = require('discord.js');

module.exports = {
    guildOnly: true,
    data: new SlashCommandBuilder()
        .setName('server-info')
        .setDescription('Updates or sends the server information layout.')
        .addStringOption(option => 
            option.setName('message_id')
                .setDescription('The ID of the message to edit (optional)')
                .setRequired(false))
        .addChannelOption(option => 
            option.setName('channel')
                .setDescription('The channel where the message is (optional)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // 1. Defer cleanly (Only you see the reply)
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // 2. Define the NEW Components Payload
        const components = [
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
                    new TextDisplayBuilder().setContent("```ansi\n\u001b[2;32m\u001b[2;37m\u001b[2;33m\u001b[2;31m\u001b[2;32m\u001b[2;34mA2-Q came from the word Al-Qabīlatān (القبيلتان) which means The Two Tribes in Arabic.\u001b[0m\u001b[2;32m\u001b[0m\u001b[2;31m\u001b[0m\u001b[2;33m\u001b[0m\u001b[2;37m\u001b[0m\u001b[2;32m\u001b[0m\n```"),
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false),
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("We’re a community server built for people who love to game, talk, and just have a good time. From chill voice chats to lively text convos, there’s always something going on.\n \nOur goal is to keep things safe, fun, and friendly — a place where everyone can relax, share moments, and enjoy being part of something good.\n\n### **A2-Q** Established Date:\n<t:1698316020:F>\n### **A2-Q Server** Created Date: \n<t:1767254820:F>"),
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
                    new TextDisplayBuilder().setContent("1. Be friendly to each other, we want to keep the chat respectful, although we do joke around quite a lot, it’s important to stay respectful.\n\n2. Keep Racism & Bad Behaviour out of the chat.\n\n3. No Spamming or Advertising.\n\nIf you notice any inappropriate behaviour or rule-breaking, do not hesitate to inform **Moderator**.\n\n```ansi\n\u001b[2;31mRule violations will lead to appropriate punishment.\u001b[0m\n```"),
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
                            new TextDisplayBuilder().setContent("### <:owner:1466994441691857063> Owner\n**Name:** Ridouan <:2007_1:1468081329206722600><:2007_2:1468081369501401269><:2007_3:1468081409280446505>\n**ID:** `837741275603009626`"),
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
                                .setURL("_")
                        )
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("### <:co_owner:1466994498268696627> Co-owner\n**Name:** Unknown <:qahtani_1:1463886050270118055><:qahtani_2:1463886211343974462><:qahtani_3:1463886253098537035>\n**ID:** `1234567890`"),
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

        // 3. Logic to Find and Edit (or Send)
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
        const targetMessageId = interaction.options.getString('message_id');

        try {
            if (targetMessageId) {
                // --- Case A: User provided a Message ID (EDIT) ---
                const messageToEdit = await targetChannel.messages.fetch(targetMessageId);

                if (!messageToEdit) {
                    return interaction.editReply({ content: `❌ Could not find message \`${targetMessageId}\` in channel ${targetChannel}.` });
                }

                if (messageToEdit.author.id !== interaction.client.user.id) {
                    return interaction.editReply({ content: '❌ I can only edit my own messages.' });
                }

                // Edit the message
                await messageToEdit.edit({ 
                    content: '',
                    components: components,
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: [] } // Ensure no pings
                });
                
                await interaction.editReply({ content: `✅ Successfully updated the server info in ${targetChannel}.` });

            } else {
                // --- Case B: No ID provided (SEND NEW) ---
                await targetChannel.send({ 
                    components: components,
                    flags: MessageFlags.IsComponentsV2,
                    allowedMentions: { parse: [] } // Ensure no pings
                });
                
                await interaction.editReply({ content: `✅ Successfully sent the new server info to ${targetChannel}.` });
            }

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: `❌ An error occurred: \`${error.message}\`.` });
        }
    },
};
