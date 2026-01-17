const { 
    ContextMenuCommandBuilder, 
    ApplicationCommandType, 
    EmbedBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ActionRowBuilder 
} = require('discord.js');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('Jumbo')
        .setType(ApplicationCommandType.Message), // Right Click > Apps > Jumbo

    async execute(interaction) {
        // 1. DEFER IMMEDIATELY
        // This buys you 15 minutes and stops the "Application didn't respond" error
        await interaction.deferReply({ ephemeral: true });

        try {
            // 2. Get the message
            const targetMessage = interaction.targetMessage;
            
            // 3. Get Sticker
            const sticker = targetMessage.stickers.first();

            if (!sticker) {
                return interaction.editReply('❌ That message does not contain a sticker.');
            }

            // 4. Handle Lottie (JSON) Stickers
            // Discord does not give a PNG URL for Lottie stickers, only the JSON file.
            if (sticker.format === 3) { // 3 = Lottie
                return interaction.editReply({ 
                    content: `⚠️ **${sticker.name}** is a Lottie (animated JSON) sticker.\nI cannot display it as an image, but here is the source file.`,
                    files: [sticker.url]
                });
            }

            // 5. Build Output
            const embed = new EmbedBuilder()
                .setTitle(`Sticker: ${sticker.name}`)
                .setImage(sticker.url)
                .setColor(0x0099FF);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Open Original')
                    .setStyle(ButtonStyle.Link)
                    .setURL(sticker.url)
            );

            // 6. Send Result
            await interaction.editReply({ 
                embeds: [embed], 
                components: [row] 
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ An error occurred while fetching the sticker.');
        }
    },
};
