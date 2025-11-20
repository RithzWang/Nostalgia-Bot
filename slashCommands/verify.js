const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Tesseract = require('tesseract.js');
const { verifiedRoleID, colourEmbed } = require('../config.json'); // Adjust path if config is elsewhere

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Upload an image containing your username to get verified.')
        .addAttachmentOption(option =>
            option.setName('image')
                .setDescription('The screenshot/image showing your username')
                .setRequired(true)
        ),

    async execute(interaction) {
        // 1. Defer the reply because OCR takes time (3-10 seconds)
        await interaction.deferReply({ ephemeral: true });

        const image = interaction.options.getAttachment('image');
        const targetRole = interaction.guild.roles.cache.get(verifiedRoleID);
        const member = interaction.member;

        // Check if Role ID is valid in config
        if (!targetRole) {
            return interaction.editReply({ content: "❌ **Configuration Error:** Verified Role ID is missing or invalid in config.json." });
        }

        // Check if user already has the role
        if (member.roles.cache.has(targetRole.id)) {
            return interaction.editReply({ content: "✅ You are already verified!" });
        }

        // Check if image is actually an image
        if (!image.contentType.startsWith('image/')) {
            return interaction.editReply({ content: "⚠️ Please upload a valid image file (PNG, JPG, etc)." });
        }

        try {
            // 2. Scan the image using Tesseract
            const { data: { text } } = await Tesseract.recognize(
                image.url,
                'eng', // Language code (English)
                // logger: m => console.log(m) // Uncomment to see progress in console
            );

            // 3. Logic: Compare text found vs Username
            // We lowerCase both to make sure "User" matches "user"
            const scannedText = text.toLowerCase();
            const username = interaction.user.username.toLowerCase();
            // We also check display name (nickname) just in case
            const displayName = member.displayName.toLowerCase();

            console.log(`[Verify] Scanned: ${text.substring(0, 50)}... | Looking for: ${username}`);

            if (scannedText.includes(username) || scannedText.includes(displayName)) {
                
                // 4. Match Found! Add Role
                await member.roles.add(targetRole);

                const successEmbed = new EmbedBuilder()
                    .setTitle("Verification Successful")
                    .setDescription(`✅ I successfully found **"${interaction.user.username}"** in the image!`)
                    .addFields(
                        { name: 'Role Added', value: `<@&${targetRole.id}>`, inline: true }
                    )
                    .setColor(colourEmbed || '#00FF00') // Fallback green if config fails
                    .setTimestamp();

                await interaction.editReply({ embeds: [successEmbed] });

            } else {
                // 5. Match Failed
                const failEmbed = new EmbedBuilder()
                    .setTitle("Verification Failed")
                    .setDescription(`❌ I could not find your username **"${interaction.user.username}"** in that image.`)
                    .addFields(
                        { name: 'Tip', value: 'Make sure the text is clear, readable, and not too small. Try cropping the image closer to your name.' }
                    )
                    .setColor('#FF0000')
                    .setImage(image.url); // Show them back the image we scanned

                await interaction.editReply({ embeds: [failEmbed] });
            }

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: "❌ Something went wrong while scanning the image. Please try again later." });
        }
    },
};
