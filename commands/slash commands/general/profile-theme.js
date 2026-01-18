const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { request } = require('undici'); // Native in Node 16+, used for fetching

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile-theme')
        .setDescription('Get the hex color of a user\'s profile theme')
        .addUserOption(option => 
            option.setName('target')
            .setDescription('The user to check (defaults to you)')
        ),

    async execute(interaction) {
        await interaction.deferReply();

        // 1. Get the Target
        const targetUser = interaction.options.getUser('target') || interaction.user;

        // 2. Fetch User (Force API call to get banner/accent info)
        // 'force: true' ensures we don't get a cached version without color data
        const user = await targetUser.fetch(true);

        // 3. Get Official Accent Color
        const officialAccentInt = user.accentColor;
        const officialAccentHex = user.hexAccentColor;

        // 4. (Optional) Unofficial Fetch Logic
        // ⚠️ WARNING: Standard Bots cannot hit the /profile endpoint. 
        // You would need a proxy service or a 3rd party API to get the TRUE dual colors.
        // Below is how you would process that data if you had it.
        let nitroPrimary = officialAccentHex || "None";
        let nitroAccent = "Hidden (Bot API Restricted)";
        
        // --- PLACEHOLDER FOR UNOFFICIAL API ---
        // try {
        //     const { body } = await request(`https://some-proxy-api.com/users/${user.id}`);
        //     const data = await body.json();
        //     if (data.theme_colors) {
        //          nitroPrimary = '#' + data.theme_colors[0].toString(16).padStart(6, '0');
        //          nitroAccent = '#' + data.theme_colors[1].toString(16).padStart(6, '0');
        //     }
        // } catch (e) { /* Ignore */ }
        // --------------------------------------

        // 5. Build Output Embed
        const embed = new EmbedBuilder()
            .setAuthor({ name: `${user.username}'s Theme`, iconURL: user.displayAvatarURL() })
            .setColor(officialAccentInt || 0x000000)
            .setDescription(`Here is the color data available for <@${user.id}>.`)
            .addFields(
                { 
                    name: '🎨 Primary / Accent (Official)', 
                    value: `\`${officialAccentHex || 'Default (Gray)'}\``, 
                    inline: true 
                },
                { 
                    name: '🌈 Nitro Gradient (Unofficial)', 
                    value: `**Primary:** \`${nitroPrimary}\`\n**Accent:** \`${nitroAccent}\`\n*Bots cannot officially see the 2nd color.*`, 
                    inline: true 
                }
            );

        // Add a preview of the color as the thumbnail or image
        if (officialAccentHex) {
            // Use a placeholder image service to show the color block
            embed.setThumbnail(`https://singlecolorimage.com/get/${officialAccentHex.substring(1)}/200x200`);
        }

        await interaction.editReply({ embeds: [embed] });
    }
};
