const { 
    ContextMenuCommandBuilder, 
    ApplicationCommandType, 
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    AttachmentBuilder, 
    FileBuilder        
} = require('discord.js');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Sticker Information')
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
            const extension = getStickerExtension(sticker.format);
            const fileName = `${sticker.id}-A2-Q.${extension}`;

            // ============================================
            // 1. PREPARE THE FILE
            // ============================================
            // Create the actual attachment logic
            const attachment = new AttachmentBuilder(sticker.url, { name: fileName });

            // Create the UI Component pointing to the attachment
            const fileComponent = new FileBuilder()
                .setURL(`attachment://${fileName}`);

            // ============================================
            // 2. BUILD THE CONTAINER
            // ============================================
            const container = new ContainerBuilder()
                .setAccentColor(0x888888); 

            // --- A. METADATA SECTION ---
            const metaSection = new SectionBuilder()
                .addTextDisplayComponents((text) => 
                    text.setContent(`## Sticker Information`)
                )
                .addTextDisplayComponents((text) => 
                    text.setContent(
                        `**Name:** ${sticker.name}\n` +
                        `**ID:** \`${sticker.id}\`\n` +
                        `**Format:** ${formatName}`
                    )
                )
                .setThumbnailAccessory((thumb) => 
                    thumb.setURL(sticker.url)
                );

            container.addSectionComponents(metaSection);

            // --- B. SEPARATOR ---
            container.addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            );

            // --- C. FILE CARD (Inside Container) ---
            // This adds the file UI to the bottom of the container
            container.addFileComponents(fileComponent);

            // ============================================
            // SEND RESPONSE
            // ============================================
            await interaction.editReply({ 
                content: '',
                components: [container], // Container now holds the file card inside it
                files: [attachment],     // The physical file must still be attached here
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

// Helper: Get readable format name
function getStickerFormat(format) {
    switch (format) {
        case 1: return 'PNG';
        case 2: return 'APNG (Animated)';
        case 3: return 'Lottie (JSON)';
        case 4: return 'GIF';
        default: return 'Unknown';
    }
}

// Helper: Get correct file extension
function getStickerExtension(format) {
    switch (format) {
        case 1: return 'png';
        case 2: return 'png'; 
        case 3: return 'json';
        case 4: return 'gif';
        default: return 'png';
    }
}
