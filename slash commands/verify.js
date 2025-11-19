const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Tesseract = require('tesseract.js');
const { verifiedRoleID, colourEmbed } = require("../config.json");

module.exports = {
    // This "data" part is what was missing!
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Upload your ID card to verify your identity.')
        .addAttachmentOption(option => 
            option.setName('card')
                .setDescription('The welcome card image')
                .setRequired(true)),
    
    async execute(interaction) {
        // Slash commands must use deferReply for long tasks (OCR takes ~5 seconds)
        await interaction.deferReply({ ephemeral: true });

        const imageAttachment = interaction.options.getAttachment('card');
        
        // Check content type
        if (!imageAttachment.contentType || !imageAttachment.contentType.startsWith('image/')) {
            return interaction.editReply({ content: "❌ Please upload a valid image file." });
        }

        try {
            // Run OCR
            const { data: { text } } = await Tesseract.recognize(imageAttachment.url, 'eng', {
                logger: m => {} 
            });

            // Normalize Text
            const scannedText = text.toLowerCase().replace(/[^a-z0-9]/g, '');
            const userUsername = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
            
            // Check Match
            if (scannedText.includes(userUsername)) {
                const member = interaction.member;
                const role = interaction.guild.roles.cache.get(verifiedRoleID);

                if (!role) return interaction.editReply({ content: "❌ Verified role not found in config." });
                if (member.roles.cache.has(role.id)) return interaction.editReply({ content: "✅ You are already verified!" });

                await member.roles.add(role);

                const successEmbed = new EmbedBuilder()
                    .setColor(colourEmbed || '#00FF00')
                    .setTitle("Verification Successful")
                    .setDescription(`Identity confirmed! Welcome, ${member}.`)
                    .setFooter({ text: "OCR Verification System" });

                await interaction.editReply({ embeds: [successEmbed] });

            } else {
                const failEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle("Verification Failed")
                    .setDescription(`❌ **Could not match your username.**\n\n**Scanned:** \`${text.substring(0, 30).replace(/\n/g, ' ')}...\`\n**Expected:** \`${interaction.user.username}\`\n\nPlease regenerate your card with \`/createcard\` and try again.`)

                await interaction.editReply({ embeds: [failEmbed] });
            }

        } catch (error) {
            console.error("OCR Error:", error);
            await interaction.editReply({ content: "❌ An error occurred while processing the image." });
        }
    },
};