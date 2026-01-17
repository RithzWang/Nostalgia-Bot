const { 
    ContextMenuCommandBuilder, 
    ApplicationCommandType, 
    MessageFlags,
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
        .setName('Sticker Enlarge')
        .setType(ApplicationCommandType.Message),

    async execute(interaction) {
        // 1. Start PUBLIC (So success messages are visible to everyone)
        await interaction.deferReply({ flags: 0 });

        try {
            const targetMessage = interaction.targetMessage;
            const sticker = targetMessage.stickers.first();

            // ============================================
            // ERROR: NO STICKER (Switch to Hidden)
            // ============================================
            if (!sticker) {
                // Delete the public "Thinking..." message
                await interaction.deleteReply();
                
                // Send a NEW hidden message
                return interaction.followUp({ 
                    content: '<:No:1297814819105144862> That message does not contain a sticker.', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            // ============================================
            // WARNING: LOTTIE JSON (Switch to Hidden)
            // ============================================
            if (sticker.format === 3) {
                // Delete the public "Thinking..." message
                await interaction.deleteReply();

                const lottieContainer = new ContainerBuilder()
                    .setAccentColor(0xFEE75C); // Yellow for Warning

                lottieContainer.addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(`### ⚠️ Lottie Sticker: ${sticker.name}`),
                    new TextDisplayBuilder()
                        .setContent(`This sticker uses the **Lottie (JSON)** format.\nI cannot display animations for these, but you can download the source file.`)
                );

                lottieContainer.addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
                );

                const btnRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setLabel('Download .JSON Source')
                        .setStyle(ButtonStyle.Link)
                        .setURL(sticker.url)
                );
                lottieContainer.addActionRowComponents(btnRow);

                // Send NEW hidden message
                return interaction.followUp({ 
                    content: '',
                    components: [lottieContainer],
                    files: [sticker.url], 
                    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
                });
            }

            // ============================================
            // SUCCESS: STANDARD IMAGE (Keep Public)
            // ============================================
            const container = new ContainerBuilder()
                .setAccentColor(0x888888); 

            // A. Title
            container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### 💖 Sticker: ${sticker.name}`)
            );

            // B. Separator (Top)
            container.addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            );

            // C. The Big Image
            const gallery = new MediaGalleryBuilder();
            gallery.addItems(item => item.setURL(sticker.url));

            container.addMediaGalleryComponents(gallery);

            // D. Separator (Bottom)
            container.addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            );

            // E. Link Button
            const btnRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Open in Browser')
                    .setStyle(ButtonStyle.Link)
                    .setURL(sticker.url)
            );

            container.addActionRowComponents(btnRow);

            // Edit the existing PUBLIC message
            await interaction.editReply({ 
                content: '',
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error(error);
            // On crash: delete public message, send hidden error
            await interaction.deleteReply().catch(() => {});
            await interaction.followUp({ 
                content: '<:No:1297814819105144862> An error occurred while fetching the sticker.',
                flags: MessageFlags.Ephemeral
            });
        }
    },
};
