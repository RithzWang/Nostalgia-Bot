const { 
    ContextMenuCommandBuilder, 
    ApplicationCommandType, 
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    MediaGalleryBuilder,
    ButtonBuilder,
    ButtonStyle,
    SeparatorBuilder,
    SeparatorSpacingSize
} = require('discord.js');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Sticker Info')
        .setType(ApplicationCommandType.Message),

    async execute(interaction) {
        // 1. Start PUBLIC
        await interaction.deferReply({ flags: 0 });

        try {
            const targetMessage = interaction.targetMessage;
            const sticker = targetMessage.stickers.first();

            // ============================================
            // ERROR: NO STICKER (Switch to Hidden)
            // ============================================
            if (!sticker) {
                await interaction.deleteReply();
                return interaction.followUp({ 
                    content: '<:No:1297814819105144862> That message does not contain a sticker.', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            const isLottie = sticker.format === 3;
            const formatName = getStickerFormat(sticker.format);

            // ============================================
            // BUILD THE CONTAINER
            // ============================================
            const container = new ContainerBuilder()
                .setAccentColor(isLottie ? 0xFEE75C : 0x888888); // Yellow for Lottie, Grey for Standard

            // --- SECTION 1: METADATA (ID, Name, Format) ---
            const metaSection = new SectionBuilder()
                .addTextDisplayComponents((text) => 
                    text.setContent(`## Sticker Information`)
                )
                .addTextDisplayComponents((text) => 
                    text.setContent(
                        `**Name:** **${sticker.name}**\n` +      `**ID:** \`${sticker.id}\`\n` +
                        `**Format:** ${formatName}` +
                        (isLottie ? '\n⚠️ *Lottie files cannot be previewed largely.*' : '')
                    )
                )
                // Add the "Link" button to the right side
                .setButtonAccessory((btn) => 
                    btn.setLabel(isLottie ? 'Download JSON' : 'Open in Browser')
                       .setStyle(ButtonStyle.Link)
                       .setURL(sticker.url)
                );

            // Add thumbnail (small preview)
            metaSection.setThumbnailAccessory((thumb) => 
                thumb.setURL(sticker.url)
            );

            container.addSectionComponents(metaSection);

            // --- SECTION 2: ENLARGED VIEW (Only if not Lottie) ---
            if (!isLottie) {
                container.addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                );

                const gallery = new MediaGalleryBuilder();
                gallery.addItems(item => item.setURL(sticker.url));
                container.addMediaGalleryComponents(gallery);
            }

            // ============================================
            // SEND RESPONSE
            // ============================================
            await interaction.editReply({ 
                content: '',
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error(error);
            await interaction.deleteReply().catch(() => {});
            await interaction.followUp({ 
                content: '<:No:1297814819105144862> An error occurred while fetching the sticker.',
                flags: MessageFlags.Ephemeral
            });
        }
    },
};

// Helper to identify sticker type
function getStickerFormat(format) {
    switch (format) {
        case 1: return 'PNG';
        case 2: return 'APNG (Animated)';
        case 3: return 'Lottie (JSON)';
        case 4: return 'GIF';
        default: return 'Unknown';
    }
}
