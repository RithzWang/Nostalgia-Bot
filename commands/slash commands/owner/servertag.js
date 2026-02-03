const { SlashCommandBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
// ⚠️ ADJUST THIS PATH
const { createServerTagCard } = require('../../../createServerTagCard.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('servertag')
        .setDescription('Generate a downloadable image of a Server Tag')
        .setDMPermission(false)
        // 👇 RESTRICT TO ADMINS ONLY
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) 
        .addUserOption(option => 
            option.setName('target')
                .setDescription('The user whose tag icon you want (optional)')
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName('mock_name')
                .setDescription('Replace the text with a custom name (keeps the icon)')
                .setRequired(false)
        ),

    async execute(interaction) {
        const targetUser = interaction.options.getMember('target') || interaction.member;
        
        // 1. Get the mock name string
        const mockName = interaction.options.getString('mock_name');

        await interaction.deferReply();

        try {
            // 2. Pass mockName to the function
            const imageBuffer = await createServerTagCard(targetUser, mockName);

            if (!imageBuffer) {
                return interaction.editReply({ 
                    content: `❌ **${targetUser.user.username}** does not have a set Server Tag, so no icon could be found.` 
                });
            }

            const attachment = new AttachmentBuilder(imageBuffer, { name: `servertag-${targetUser.id}.png` });

            await interaction.editReply({ 
                content: `Here is the server tag for **${targetUser.user.username}**${mockName ? ` (Custom Text: "${mockName}")` : ''}:`, 
                files: [attachment] 
            });

        } catch (error) {
            console.error('Error generating server tag card:', error);
            await interaction.editReply({ content: '⚠️ An error occurred.' });
        }
    },
};
