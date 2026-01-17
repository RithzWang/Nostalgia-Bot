const { 
    ContextMenuCommandBuilder, 
    ApplicationCommandType, 
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize
} = require('discord.js');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Sticker ID')
        .setType(ApplicationCommandType.Message),

    async execute(interaction) {
        // 1. Start EPHEMERAL (Hidden) because IDs are usually just for the user
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const targetMessage = interaction.targetMessage;
            const sticker = targetMessage.stickers.first();

            // ============================================
            // ERROR: NO STICKER
            // ============================================
            if (!sticker) {
                return interaction.editReply({ 
                    content: '<:No:1297814819105144862> That message does not contain a sticker.' 
                });
            }

            // ============================================
            // SUCCESS: SHOW ID
            // ============================================
            const container = new ContainerBuilder()
                .setAccentColor(0x888888); // Blurple

            const section = new SectionBuilder()
                // 1. Title
                .addTextDisplayComponents((text) => 
                    text.setContent(`## Sticker Info`)
                )
                // 2. Info Block (ID in code block for easy copying)
                .addTextDisplayComponents((text) => 
                    text.setContent(
                        `**Name:** ${sticker.name}\n` +
                        `**ID:** \`${sticker.id}\`\n` +
                        `**Format:** ${getStickerFormat(sticker.format)}`
                    )
                )
                // 3. Thumbnail (Small preview of the sticker)
                .setThumbnailAccessory((thumb) => 
                    thumb.setURL(sticker.url)
                );

            container.addSectionComponents(section);

            // Optional: Separator for cleanliness
            container.addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            );

            await interaction.editReply({ 
                content: '',
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply({ 
                content: '<:No:1297814819105144862> An error occurred while fetching the sticker.'
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
