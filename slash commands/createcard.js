const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { createWelcomeImage } = require('../welcomeCanvas.js'); // Make sure path to utils is correct

module.exports = {
    // This "data" part is what was missing!
    data: new SlashCommandBuilder()
        .setName('createcard')
        .setDescription('Generates your verification ID card manually.'),
    
    async execute(interaction) {
        await interaction.deferReply();

        try {
            const member = interaction.member;
            // Generate image
            const welcomeImageBuffer = await createWelcomeImage(member);
            const attachment = new AttachmentBuilder(welcomeImageBuffer, { name: 'verification-card.png' });

            await interaction.editReply({ 
                content: `Here is your verification card, <@${member.id}>. Download it and use \`/verify\` to gain access!`,
                files: [attachment] 
            });
        } catch (error) {
            console.error("Error generating card:", error);
            await interaction.editReply({ content: "❌ There was an error generating your card." });
        }
    },
};