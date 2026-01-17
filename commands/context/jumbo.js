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
    ButtonStyle
} = require('discord.js');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Jumbo')
        .setType(ApplicationCommandType.Message),

    async execute(interaction) {
        // 1. Defer (Ephemeral so only you see it, change to false if you want everyone to see)
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const targetMessage = interaction.targetMessage;
            const sticker = targetMessage.stickers.first();

            // --- VALIDATION ---
            if (!sticker) {
                return interaction.editReply('❌ That message does not contain a sticker.');
            }

            // Lottie (JSON) check
            if (sticker.format === 3) {
                return interaction.editReply({ 
                    content: `⚠️ **${sticker.name}** is a Lottie (animated JSON) sticker.\nI cannot convert it to an image, but here is the source file.`,
                    files: [sticker.url]
                });
            }

            // --- BUILD CONTAINER ---
            const container = new ContainerBuilder()
                .setAccentColor(0x888888); // Requested Colour

            // 1. Title
            const title = new TextDisplayBuilder()
                .setContent(`### 🖼️ Sticker: ${sticker.name}`);
            
            container.addTextDisplayComponents(title);

            // 2. The Big Image (Using Gallery)
            const gallery = new MediaGalleryBuilder();
            // We use the callback pattern to set the URL
            gallery.addItems(item => item.setURL(sticker.url));

            container.addMediaGalleryComponents(gallery);

            // 3. Link Button
            const btnRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Open Original')
                    .setStyle(ButtonStyle.Link)
                    .setURL(sticker.url)
            );

            container.addActionRowComponents(btnRow);

            // --- SEND ---
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
