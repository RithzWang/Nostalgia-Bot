const { AttachmentBuilder } = require('discord.js');
const { createWelcomeImage } = require('../utils/welcomeCanvas'); // Ensure this path is correct based on your folder structure

module.exports = {
    name: 'createcard',
    aliases: ['gen-id', 'idcard'], // You can add alternative names here
    description: 'Generates your verification ID card manually.',
    
    async execute(message, args) {
        // Send a placeholder message because image generation takes a second
        const loadingMsg = await message.reply("🎨 Generating your ID card... please wait.");

        try {
            const member = message.member;
            const welcomeImageBuffer = await createWelcomeImage(member);
            const attachment = new AttachmentBuilder(welcomeImageBuffer, { name: 'verification-card.png' });

            // Edit the loading message with the final result
            await loadingMsg.delete(); // Delete loading text
            await message.channel.send({ 
                content: `Here is your verification card, ${member}. Download it and upload it with \`!verify\` to gain access!`,
                files: [attachment] 
            });

        } catch (error) {
            console.error("Error generating card:", error);
            await loadingMsg.edit("❌ There was an error generating your card. Please contact an admin.");
        }
    },
};