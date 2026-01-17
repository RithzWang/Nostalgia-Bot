const { 
    ContextMenuCommandBuilder, 
    ApplicationCommandType, 
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    ActionRowBuilder, // Not needed for the main button anymore, but kept for Lottie/Error if needed
    ButtonBuilder,
    ButtonStyle,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder // <--- Added this import
} = require('discord.js');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Sticker Enlarge')
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

            // ============================================
            // WARNING: LOTTIE JSON (Switch to Hidden)
            // ============================================
            if (sticker.format === 3) {
                await interaction.deleteReply();

                const lottieContainer = new ContainerBuilder()
                    .setAccentColor(0xFEE75C); 

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

                return interaction.followUp({ 
                    content: '',
                    components: [lottieContainer],
                    files: [sticker.url], 
                    flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2
                });
            }

            // ============================================
            // SUCCESS: STANDARD IMAGE (Public)
            // ============================================
            const container = new ContainerBuilder()
                .setAccentColor(0x888888); 

            // A. Header Section (Title + Button Side-by-Side)
            const headerSection = new SectionBuilder()
                // 1. The Text
                .addTextDisplayComponents((text) => 
                    text.setContent(`## Sticker: ${sticker.name}`)
                )
                // 2. The Button (Accessory)
                .setButtonAccessory((btn) => 
                    btn.setLabel('Open in Browser')
                       .setStyle(ButtonStyle.Link)
                       .setURL(sticker.url)
                );

            container.addSectionComponents(headerSection);

            // B. Separator
            container.addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            );

            // C. The Big Image
            const gallery = new MediaGalleryBuilder();
            gallery.addItems(item => item.setURL(sticker.url));

            container.addMediaGalleryComponents(gallery);

            // Edit the existing PUBLIC message
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
