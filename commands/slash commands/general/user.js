const { 
    SlashCommandBuilder, MessageFlags, ContainerBuilder, 
    SectionBuilder, ThumbnailBuilder, TextDisplayBuilder, 
    SeparatorBuilder, SeparatorSpacingSize 
} = require('discord.js');

// 1. Import your private scraper
const { fetchAdvancedProfile } = require('../../../utils/v9Scraper');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('user')
        .setDescription('Fetch advanced user information using our private v9 API.')
        .addUserOption(opt => opt.setName('target')
            .setDescription('The user to lookup (defaults to yourself)')
            .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('target') || interaction.user;
        const userId = targetUser.id;

        try {
            // 2. USE YOUR SCRAPER INSTEAD OF JAPI
            const v9Data = await fetchAdvancedProfile(userId);
            
            if (!v9Data) {
                return interaction.editReply({ content: "❌ **Error:** Could not fetch data. The Burner Token might be rate-limited." });
            }

            // 3. EXTRACT THE DATA
            // The JSON structure from v9 is slightly different than JAPI!
            const globalName = v9Data.user?.global_name || v9Data.user?.username;
            const username = v9Data.user?.username;
            const avatarHash = v9Data.user?.avatar;
            const avatarUrl = avatarHash 
                ? `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=1024` 
                : targetUser.displayAvatarURL({ size: 1024, forceStatic: false });
            
            const bannerColor = v9Data.user_profile?.banner_color || "None";
            const bioText = v9Data.user_profile?.bio || "No bio set.";
            const badges = v9Data.badges?.map(b => b.description).join(', ') || "None";
            
            const accentHex = v9Data.user?.accent_color ? `#${v9Data.user.accent_color.toString(16).padStart(6, '0')}` : "None";
            const accentColorInt = v9Data.user?.accent_color || 3447003; 

            // 4. BUILD YOUR UI
            const container = new ContainerBuilder()
                .setAccentColor(accentColorInt)
                .addSectionComponents(
                    new SectionBuilder()
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`## ${globalName}`),
                            new TextDisplayBuilder().setContent(
                                `**Username:** ${username}\n` +
                                `**ID:** \`${userId}\`\n` +
                                `**Badges:** ${badges}\n` +
                                `**Colors:** Accent \`${accentHex}\` / Banner \`${bannerColor}\`\n\n` +
                                `**Bio:**\n${bioText}`
                            )
                        )
                )
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Data provided by Private API • <t:${Math.floor(Date.now() / 1000)}:R>`));

            // Attach Banner link if they have one
            const bannerHash = v9Data.user_profile?.banner;
            if (bannerHash) {
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`[View Profile Banner](https://cdn.discordapp.com/banners/${userId}/${bannerHash}.png?size=1024)`)
                );
            }

            await interaction.editReply({ 
                components: [container], 
                flags: [MessageFlags.IsComponentsV2] 
            });

        } catch (error) {
            console.error("Command Error:", error);
            await interaction.editReply({ content: "❌ **Error:** Something went wrong formatting the data." });
        }
    }
};
