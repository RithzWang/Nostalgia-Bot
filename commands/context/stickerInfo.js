const { 
    ContextMenuCommandBuilder, 
    ApplicationCommandType, 
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    ButtonBuilder,
    ButtonStyle,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder // <--- Added ActionRowBuilder
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
            // ERROR: NO STICKER
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
                .setAccentColor(isLottie ? 0xFEE75C : 0x888888); 

            // --- SECTION 1: METADATA (Text + Thumbnail) ---
            const metaSection = new SectionBuilder()
                .addTextDisplayComponents((text) => 
                    text.setContent(`## Sticker Information`)
                )
                .addTextDisplayComponents((text) => 
                    text.setContent(
                        `**Name:** **${sticker.name}**\n` +
                        `**ID:** \`${sticker.id}\`\n` +
                        `**Format:** ${formatName}`
                    )
                )
                // Thumbnail stays on the right
                .setThumbnailAccessory((thumb) => 
                    thumb.setURL(sticker.url)
                );

            container.addSectionComponents(metaSection);

            // --- SECTION 2: SEPARATOR ---
            container.addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            );

            // --- SECTION 3: BUTTON (Under Separator) ---
            // We use an ActionRow for the button now, instead of an accessory
            const buttonRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel(isLottie ? 'Download JSON' : 'Open in Browser')
                    .setStyle(ButtonStyle.Link)
                    .setURL(sticker.url) 
            );

            container.addActionRowComponents(buttonRow);

            // ============================================
            // SEND RESPONSE
            // ============================================
            await interaction.editReply({ 
                content: '',
                components: [container],
                // If it's a Lottie, we also attach the actual file to the message 
                // so it's easy to drag-and-drop
                files: isLottie ? [sticker.url] : [],
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
