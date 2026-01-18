const { 
    ContextMenuCommandBuilder, 
    ApplicationCommandType, 
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits
} = require('discord.js');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Steal Sticker')
        .setType(ApplicationCommandType.Message)
        // Only allow people with permission to manage stickers to use this
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEmojisAndStickers),

    async execute(interaction) {
        // Ephemeral so only you see the stealing interface
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const targetMessage = interaction.targetMessage;
            const sticker = targetMessage.stickers.first();

            // 1. VALIDATION
            if (!sticker) {
                return interaction.editReply({ 
                    content: '<:no:1297814819105144862> That message does not contain a sticker.' 
                });
            }

            // 2. ANALYZE FORMAT
            let formatLabel = 'Unknown';
            let isLottie = false;

            switch (sticker.format) {
                case 1: formatLabel = 'PNG (Static)'; break;
                case 2: formatLabel = 'APNG (Animated)'; break;
                case 3: formatLabel = 'Lottie (JSON)'; isLottie = true; break;
                case 4: formatLabel = 'GIF'; break;
            }

            // 3. BUILD PREVIEW CONTAINER
            const container = new ContainerBuilder()
                .setAccentColor(0x888888) // Dark grey
                .addTextDisplayComponents(t => t.setContent('## Steal this Sticker?'))
                .addSectionComponents(section => 
                    section
                        .addTextDisplayComponents(t => 
                            t.setContent(
                                `**Name:** ${sticker.name}\n` +
                                `**Format:** ${formatLabel}`
                            )
                        )
                        // Show the sticker visual as a thumbnail accessory
                        .setThumbnailAccessory(thumb => thumb.setURL(sticker.url))
                )
                .addSeparatorComponents(s => s.setSpacing(SeparatorSpacingSize.Small));

            // 4. CREATE ACTION BUTTON
            const addBtn = new ButtonBuilder()
                .setCustomId('steal_confirm')
                .setLabel('Add to Server')
                .setEmoji('📥') // Inbox Tray emoji
                .setStyle(ButtonStyle.Success);

            // Disable for Lottie because bots often fail to upload raw JSON without conversion
            if (isLottie) {
                addBtn.setDisabled(true).setLabel('Lottie Not Supported');
            }

            const row = new ActionRowBuilder().addComponents(addBtn);
            container.addActionRowComponents(r => r.setComponents(addBtn));

            // 5. SEND INTERFACE
            const response = await interaction.editReply({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

            // 6. HANDLE BUTTON CLICK
            const collector = response.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.customId === 'steal_confirm') {
                    await i.deferUpdate();

                    try {
                        // Attempt to create the sticker in the guild
                        // 'tags' is required by Discord API (usually emoji-like keywords)
                        const createdSticker = await interaction.guild.stickers.create({
                            file: sticker.url,
                            name: sticker.name,
                            tags: sticker.tags && sticker.tags.length > 0 ? sticker.tags : 'sticker' 
                        });

                        // Success Message
                        const successContainer = new ContainerBuilder()
                            .setAccentColor(0x888888) // Green
                            .addTextDisplayComponents(t => 
                                t.setContent(`### <:yes:1297814648417943565> Sticker Added!\nAdded \`${createdSticker.name}\` to this server.`)
                            );

                        await i.editReply({ components: [successContainer] });
                        collector.stop();

                    } catch (err) {
                        console.error(err);
                        // Often fails if slots are full or file is too big
                        await i.followUp({ 
                            content: `<:no:1297814819105144862> **Failed:** ${err.message}\n*(Check if server sticker slots are full)*`, 
                            ephemeral: true 
                        });
                    }
                }
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply(`<:no:1297814819105144862> An error occurred: ${error.message}`);
        }
    }
};
