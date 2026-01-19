const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
// ⚠️ ADJUST THIS PATH to match where you saved the helper function file
const { createServerTagCard } = require('../../../createServerTagCard.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('server-tag')
        .setDescription('Generate a downloadable image of a user\'s Server (Clan) Tag')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The user whose tag you want to see (optional)')
                .setRequired(false)
        ),

    async execute(interaction) {
        // 1. Get target member (or fallback to the command sender)
        // We use 'target' as the option name defined above
        const targetUser = interaction.options.getMember('target') || interaction.member;

        // 2. Defer the reply because image generation might take > 3 seconds
        await interaction.deferReply();

        try {
            // 3. Generate the card using your helper function
            const imageBuffer = await createServerTagCard(targetUser);

            // 4. Check if generation failed (e.g., User has no tag)
            if (!imageBuffer) {
                return interaction.editReply({ 
                    content: `❌ **${targetUser.user.username}** does not have a set Server Tag (Clan Tag).` 
                });
            }

            // 5. Create the attachment
            const attachment = new AttachmentBuilder(imageBuffer, { name: `servertag-${targetUser.id}.png` });

            // 6. Send the image
            await interaction.editReply({ 
                content: `Here is the server tag for **${targetUser.user.username}**:`, 
                files: [attachment] 
            });

        } catch (error) {
            console.error('Error generating server tag card:', error);
            // Handle errors gracefully so the bot doesn't hang
            await interaction.editReply({ 
                content: '⚠️ An error occurred while generating the image.' 
            });
        }
    },
};
