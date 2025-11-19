const { EmbedBuilder } = require('discord.js');
const Tesseract = require('tesseract.js');
const { verifiedRoleID, colourEmbed } = require("../config.json");

module.exports = {
    name: 'verify',
    aliases: ['scan'],
    description: 'Upload your ID card to verify your identity.',
    
    async execute(message, args) {
        // 1. Check for attachments
        const attachment = message.attachments.first();

        if (!attachment) {
            return message.reply("❌ Please attach your verification card image and type `!verify` in the caption (or send the image, then reply to it with !verify).");
        }

        // 2. Check file type
        if (!attachment.contentType || !attachment.contentType.startsWith('image/')) {
            return message.reply("❌ That doesn't look like an image. Please upload a valid PNG or JPG.");
        }

        // 3. Send "Processing" message
        const processingMsg = await message.reply("🔍 Scanning your ID card... This takes about 5-10 seconds.");

        try {
            // 4. Run OCR
            const { data: { text } } = await Tesseract.recognize(attachment.url, 'eng', {
                logger: m => {} // Squelch logs
            });

            // 5. Normalize Text (Remove symbols, lowercase)
            const scannedText = text.toLowerCase().replace(/[^a-z0-9]/g, '');
            const userUsername = message.author.username.toLowerCase().replace(/[^a-z0-9]/g, '');

            // 6. Check for Match
            if (scannedText.includes(userUsername)) {
                const role = message.guild.roles.cache.get(verifiedRoleID);

                if (!role) {
                    await processingMsg.edit("❌ Error: Verified role ID is invalid in config.");
                    return;
                }

                if (message.member.roles.cache.has(role.id)) {
                    await processingMsg.edit("✅ You are already verified!");
                    return;
                }

                await message.member.roles.add(role);

                const successEmbed = new EmbedBuilder()
                    .setColor(colourEmbed || '#00FF00')
                    .setTitle("Verification Successful")
                    .setDescription(`Identity confirmed! Welcome to the server, ${message.author}.`)
                    .setFooter({ text: "OCR Verification System" });

                await processingMsg.edit({ content: "Done!", embeds: [successEmbed] });

            } else {
                // 7. Failed Match
                const failEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle("Verification Failed")
                    .setDescription(`❌ **Could not match your username.**\n\n**Scanned:** \`...${text.substring(0, 20).replace(/\n/g, ' ')}...\`\n**Expected:** \`${message.author.username}\`\n\n**Tips:**\n1. Ensure the image is clear.\n2. Ensure you are uploading *your* card.\n3. Try \`!createcard\` to get a fresh one.`)
                
                await processingMsg.edit({ content: null, embeds: [failEmbed] });
            }

        } catch (error) {
            console.error("OCR Error:", error);
            await processingMsg.edit("❌ An error occurred while scanning the image. Try again later.");
        }
    },
};