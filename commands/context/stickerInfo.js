const { 
    ContextMenuCommandBuilder, 
    ApplicationCommandType, 
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    AttachmentBuilder, // <--- New Import
    FileBuilder        // <--- New Import
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
            const extension = getStickerExtension(sticker.format);
            
            // Create a safe filename (e.g., "sticker.png" or "sticker.json")
            const fileName = `sticker.${extension}`;

            // ============================================
            // 1. BUILD THE INFO CONTAINER
            // ============================================
            const container = new ContainerBuilder()
                .setAccentColor(0x888888); 

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
                .setThumbnailAccessory((thumb) => 
                    thumb.setURL(sticker.url)
                );

            container.addSectionComponents(metaSection);

            // Optional: Separator between info and the file card below
            container.addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            );

            // ============================================
            // 2. PREPARE THE FILE COMPONENT
            // ============================================
            
            // A. Create the actual file attachment from the URL
            const attachment = new AttachmentBuilder(sticker.url, { name: fileName });

            // B. Create the File Component (The UI card)
            // We reference the attachment using "attachment://filename"
            const fileComponent = new FileBuilder()
                .setURL(`attachment://${fileName}`);

            // ============================================
            // SEND RESPONSE
            // ============================================
            await interaction.editReply({ 
                content: '',
                // We send BOTH the Container and the FileComponent
                components: [container, fileComponent],
                files: [attachment],
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
        case 2: return 'png'; // APNG usually uses .png extension
        case 3: return 'json';
        case 4: return 'gif';
        default: return 'png';
    }
}
