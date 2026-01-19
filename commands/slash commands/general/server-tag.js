const { createServerTagCard } = require('../../../createServerTagCard.js');
const { AttachmentBuilder } = require('discord.js');

// Inside your command execute function:
async execute(interaction) {
    // 1. Get target member (or self)
    const targetUser = interaction.options.getMember('target') || interaction.member;

    await interaction.deferReply();

    // 2. Generate the card
    const imageBuffer = await createServerTagCard(targetUser);

    // 3. Check if generation failed (User has no tag)
    if (!imageBuffer) {
        return interaction.editReply({ 
            content: `❌ **${targetUser.user.username}** does not have a set Server Tag (Clan Tag).` 
        });
    }

    // 4. Send image
    const attachment = new AttachmentBuilder(imageBuffer, { name: 'servertag.png' });
    await interaction.editReply({ files: [attachment] });
}
