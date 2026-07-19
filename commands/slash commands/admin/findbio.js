const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { fetchAdvancedProfile } = require('../../../utils/v9Scraper'); // Adjust path to your scraper

module.exports = {
    data: new SlashCommandBuilder()
        .setName('findbio')
        .setDescription('Find users with specific text/links in their bio.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Lock to Admins to prevent abuse
        .addStringOption(option => 
            option.setName('content')
                .setDescription('The text or link to search for in bios (e.g., https://guns.lol/)')
                .setRequired(true)
        ),

    async execute(interaction) {
        // Defer reply because this process will take a long time
        await interaction.deferReply();
        
        const searchContent = interaction.options.getString('content').toLowerCase();
        const members = await interaction.guild.members.fetch();
        
        let matches = [];
        let checkedUsers = 0;
        
        // Define limits to prevent Discord API bans and command timeouts
        const MAX_MATCHES = 5; 
        const MAX_CHECKS = 100; // Increase this if you want it to scan more people (will take longer)

        await interaction.editReply(`⏳ Scanning bios for \`${searchContent}\`... This may take a minute to avoid API rate limits.`);

        for (const [id, member] of members) {
            if (member.user.bot) continue; // Skip bots

            try {
                // Fetch their profile using your v9 Scraper
                const profileData = await fetchAdvancedProfile(member.id).catch(() => null);
                
                if (profileData && profileData.user_profile && profileData.user_profile.bio) {
                    const bio = profileData.user_profile.bio;
                    
                    if (bio.toLowerCase().includes(searchContent)) {
                        matches.push(`### <@${member.user.id}> \`${member.user.id}\`\n\`\`\`text\n${bio}\n\`\`\``);
                    }
                }
            } catch (error) {
                console.error(`Failed to fetch bio for ${member.user.tag}`);
            }

            checkedUsers++;

            // 🛑 SAFETY DELAY: Wait 500ms between each request so Discord doesn't ban the bot's IP
            await new Promise(resolve => setTimeout(resolve, 500));

            // Stop if we hit our limits
            if (matches.length >= MAX_MATCHES || checkedUsers >= MAX_CHECKS) {
                break;
            }
        }

        // --- FORMATTING THE RESPONSE ---
        if (matches.length === 0) {
            return interaction.editReply(`❌ No users found with \`${searchContent}\` in their bio (Checked ${checkedUsers} members).`);
        }

        let responseText = `✅ **Found ${matches.length} users with matching bios** (Checked ${checkedUsers} members):\n\n`;
        responseText += matches.join('\n\n');

        // Discord has a 2000 character limit per message. If it's too long, slice it.
        if (responseText.length > 2000) {
            responseText = responseText.substring(0, 1990) + '...';
        }

        await interaction.editReply({ content: responseText });
    }
};
