const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Tesseract = require('tesseract.js');
const { verifiedRoleID, colourEmbed } = require("../config.json");

module.exports = {
    data: new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Upload your ID card to verify your identity.')
        .addAttachmentOption(option => 
            option.setName('card')
                .setDescription('The welcome card image')
                .setRequired(true)),
    
    async execute(interaction) {
        console.log(`[VERIFY] Command triggered by ${interaction.user.tag}`);

        // 1. Defer immediately (Tells Discord "I'm working on it")
        try {
            await interaction.deferReply({ ephemeral: true });
        } catch (err) {
            console.error("[VERIFY] Failed to defer reply:", err);
            return; // Can't do anything if we can't reply
        }

        // 2. Basic Checks (Do these BEFORE the heavy scanning)
        if (!interaction.guild) {
            return interaction.editReply("❌ You can only use this command inside the server.");
        }

        const role = interaction.guild.roles.cache.get(verifiedRoleID);
        if (!role) {
            console.error(`[VERIFY ERROR] Role ID ${verifiedRoleID} not found in this server.`);
            return interaction.editReply("❌ **Config Error:** The 'Verified' role does not exist on this server. Please tell an admin.");
        }

        if (interaction.member.roles.cache.has(role.id)) {
            return interaction.editReply("✅ You are already verified! No need to scan again.");
        }

        const imageAttachment = interaction.options.getAttachment('card');
        if (!imageAttachment.contentType || !imageAttachment.contentType.startsWith('image/')) {
            return interaction.editReply("❌ Please upload a valid image file (PNG or JPG).");
        }

        // 3. Run OCR (The Heavy Part)
        try {
            console.log(`[VERIFY] Starting Scan for ${interaction.user.tag}...`);
            
            const { data: { text } } = await Tesseract.recognize(imageAttachment.url, 'eng', {
                // This prevents the console from getting flooded with progress bars
                logger: m => { if(m.status === 'recognizing text') console.log(`[OCR] Progress: ${(m.progress * 100).toFixed(0)}%`) }
            });

            console.log(`[VERIFY] Scan complete. Found text length: ${text.length}`);

            // 4. Clean and Match
            // We remove spaces and special characters to make matching easier
            // e.g. "User Name!" becomes "username"
            const scannedText = text.toLowerCase().replace(/[^a-z0-9]/g, '');
            const userUsername = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '');
            
            console.log(`[DEBUG] Matching: Scanned '${scannedText.substring(0, 15)}...' vs User '${userUsername}'`);

            if (scannedText.includes(userUsername)) {
                await interaction.member.roles.add(role);
                
                const successEmbed = new EmbedBuilder()
                    .setColor(colourEmbed || '#00FF00')
                    .setTitle("Verification Successful")
                    .setDescription(`Identity confirmed! You have been given the <@&${role.id}> role.`)
                    .setTimestamp();

                await interaction.editReply({ embeds: [successEmbed] });
                console.log(`[VERIFY] Success for ${interaction.user.tag}`);
            } else {
                const failEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle("Verification Failed")
                    .setDescription(`❌ **Could not verify identity.**\n\n**We scanned:**\n\`${text.substring(0, 100).replace(/\n/g, ' ')}...\`\n\n**We looked for:**\n\`${interaction.user.username}\``)
                    .setFooter({ text: "Try generating a new card with /createcard" });

                await interaction.editReply({ embeds: [failEmbed] });
                console.log(`[VERIFY] Failed match for ${interaction.user.tag}`);
            }

        } catch (error) {
            console.error("[VERIFY CRASH]", error);
            await interaction.editReply("❌ **System Error:** The scanner crashed. This usually happens if the image is too large or the server is busy. Please try again.");
        }
    },
};