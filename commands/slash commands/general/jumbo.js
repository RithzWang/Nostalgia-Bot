const { 
    ContextMenuCommandBuilder, 
    ApplicationCommandType, 
    EmbedBuilder, 
    AttachmentBuilder 
} = require('discord.js');

module.exports = {
    data: new ContextMenuCommandBuilder()
        .setName('jumbo')
        .setType(ApplicationCommandType.Message), // This makes it appear in Right Click > Apps

    async execute(interaction) {
        // 1. Get the message the user right-clicked on
        const targetMessage = interaction.targetMessage;

        // 2. Check if the message has any stickers
        const sticker = targetMessage.stickers.first();

        if (!sticker) {
            return interaction.reply({ 
                content: '❌ That message does not contain a sticker.', 
                ephemeral: true 
            });
        }

        // 3. Handle Lottie stickers (Discord limitations)
        // Format 3 is Lottie (JSON). Discord doesn't provide a direct image URL for these.
        if (sticker.format === 3) {
            return interaction.reply({ 
                content: '⚠️ This is a **Lottie** sticker (JSON animation). I cannot convert it to an image/gif directly.',
                files: [
                    { attachment: sticker.url, name: `${sticker.name}.json` }
                ],
                ephemeral: true
            });
        }

        // 4. Send the sticker image/gif
        const embed = new EmbedBuilder()
            .setTitle(`Jumbo: ${sticker.name}`)
            .setImage(sticker.url) // Set the embed image to the sticker URL
            .setColor('Random')
            .setFooter({ text: `Sent by ${targetMessage.author.tag}` });

        // We also send it as a button or just the embed so they can open/download
        await interaction.reply({ 
            embeds: [embed],
            // Optional: Add a button to download original
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            style: 5,
                            label: 'Open Original',
                            url: sticker.url
                        }
                    ]
                }
            ]
        });
    },
};
