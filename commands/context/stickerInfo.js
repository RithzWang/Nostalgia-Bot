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
                // If deferred, we must delete or edit. deleteReply + followUp is cleanest for error.
                await interaction.deleteReply();
                return interaction.followUp({ 
                    content: '<:No:1297814819105144862> That message does not contain a sticker.', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            // fetch the format details
            const formatName = getStickerFormat(sticker.format);
            const extension = getStickerExtension(sticker.format);
            const fileName = `${sticker.id}.${extension}`; 

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
                        `**Format:** ${formatName}\n` + // This will now show "APNG" clearly
                        `**File Type:** \`.${extension}\``
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

            // --- C. FILE CARD ---
            container.addFileComponents(fileComponent);

            // ============================================
            // SEND RESPONSE
            // ============================================
            await interaction.editReply({ 
                content: '',
                components: [container], 
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
        case 1: return 'PNG (Static)';
        case 2: return 'APNG (Animated PNG)'; // Clarified this label
        case 3: return 'Lottie (Vector JSON)';
        case 4: return 'GIF';
        default: return 'Unknown Format';
    }
}

// Helper: Get correct file extension
function getStickerExtension(format) {
    switch (format) {
        case 1: return 'png';
        case 2: return 'png'; // APNGs use .png extension strictly
        case 3: return 'json';
        case 4: return 'gif';
        default: return 'png';
    }
}
