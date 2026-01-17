const { 
    ContextMenuCommandBuilder, 
    ApplicationCommandType, 
    MessageFlags,
    // V2 Imports
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SeparatorBuilder,
    SeparatorSpacingSize
} = require('discord.js');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Jumbo')
        .setType(ApplicationCommandType.Message),

    async execute(interaction) {
        // Change 'ephemeral: true' to 'false' if you want others to see the result
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const targetMessage = interaction.targetMessage;
            const sticker = targetMessage.stickers.first();

            // --- VALIDATION ---
            if (!sticker) {
                return interaction.editReply('❌ That message does not contain a sticker.');
            }

            // ============================================
            // 1. LOTTIE (JSON) STICKER HANDLING
            // ============================================
            if (sticker.format === 3) {
                const lottieContainer = new ContainerBuilder()
                    .setAccentColor(0x888888); // Matching Gray

                // Title & Explanation
                lottieContainer.addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(`### ⚠️ Lottie Sticker: ${sticker.name}`),
                    new TextDisplayBuilder()
                        .setContent(`This sticker uses the **Lottie (JSON)** format.\nDiscord does not provide a static image or GIF for these types of animations, but you can download the source file below.`)
                );

                // Separator
                lottieContainer.addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                );

                // Download Button
                const btnRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setLabel('Download .JSON Source')
                        .setStyle(ButtonStyle.Link)
                        .setURL(sticker.url)
                );
                lottieContainer.addActionRowComponents(btnRow);

                return interaction.editReply({ 
                    content: '',
                    components: [lottieContainer],
                    // We can still attach the file for convenience
                    files: [sticker.url], 
                    flags: MessageFlags.IsComponentsV2
                });
            }

            // ============================================
            // 2. STANDARD IMAGE/GIF HANDLING
            // ============================================
            const container = new ContainerBuilder()
                .setAccentColor(0x888888); 

            // Title
            const title = new TextDisplayBuilder()
                .setContent(`### 🖼️ Sticker: ${sticker.name}`);
            
            container.addTextDisplayComponents(title);

            // The Big Image
            const gallery = new MediaGalleryBuilder();
            gallery.addItems(item => item.setURL(sticker.url));

            container.addMediaGalleryComponents(gallery);

            // Link Button
            const btnRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Open Original')
                    .setStyle(ButtonStyle.Link)
                    .setURL(sticker.url)
            );

            container.addActionRowComponents(btnRow);

            // Send
            await interaction.editReply({ 
                content: '',
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ An error occurred while fetching the sticker.');
        }
    },
};
