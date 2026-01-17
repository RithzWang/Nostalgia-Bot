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
        // 1. Start PUBLIC (Everyone sees "Bot is thinking...")
        await interaction.deferReply({ flags: 0 });

        try {
            const targetMessage = interaction.targetMessage;
            const sticker = targetMessage.stickers.first();

            // ============================================
            // ERROR: NO STICKER (Switch to Hidden)
            // ============================================
            // If no sticker, we delete the public "thinking" message
            // and send a private error so chat stays clean.
            if (!sticker) {
                await interaction.deleteReply(); // 🗑️ Delete public loader
                return interaction.followUp({ 
                    content: '<:No:1297814819105144862> That message does not contain a sticker.', 
                    flags: MessageFlags.Ephemeral // 👻 Send hidden error
                });
            }

            // ============================================
            // SUCCESS: SHOW ID (Edit Public Message)
            // ============================================
            const container = new ContainerBuilder()
                .setAccentColor(0x888888); 

            const section = new SectionBuilder()
                .addTextDisplayComponents((text) => 
                    text.setContent(`## Sticker Info`)
                )
                .addTextDisplayComponents((text) => 
                    text.setContent(
                        `**Name:** ${sticker.name}\n` +
                        `**ID:** \`${sticker.id}\`\n` +
                        `**Format:** ${getStickerFormat(sticker.format)}`
                    )
                )
                .setThumbnailAccessory((thumb) => 
                    thumb.setURL(sticker.url)
                );

            container.addSectionComponents(section);

            container.addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
            );

            // Edit the existing PUBLIC message to show the result
            await interaction.editReply({ 
                content: '',
                components: [container],
                flags: MessageFlags.IsComponentsV2 
            });

        } catch (error) {
            console.error(error);
            // If code crashes, try to clean up
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
