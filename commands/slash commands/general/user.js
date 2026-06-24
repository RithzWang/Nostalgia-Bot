const { 
    SlashCommandBuilder, MessageFlags, ContainerBuilder, 
    SectionBuilder, ThumbnailBuilder, TextDisplayBuilder, 
    SeparatorBuilder, SeparatorSpacingSize 
} = require('discord.js');

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
            // 1. FETCH DATA FROM PRIVATE SCRAPER
            const v9Data = await fetchAdvancedProfile(userId);
            
            if (!v9Data) {
                return interaction.editReply({ content: "❌ **Error:** Could not fetch data. The Burner Token might be rate-limited." });
            }

            // 2. BASIC PROFILE DATA
            const globalName = v9Data.user?.global_name || v9Data.user?.username;
            const username = v9Data.user?.username;
            const avatarHash = v9Data.user?.avatar;
            const avatarUrl = avatarHash 
                ? `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=1024` 
                : targetUser.displayAvatarURL({ size: 1024, forceStatic: false });
            
            const bioText = v9Data.user_profile?.bio || "No bio set.";
            const badges = v9Data.badges?.map(b => b.description).join(', ') || "None";
            
            // 3. COLOR EXTRACTION (Standard + Nitro Theme)
            const bannerColor = v9Data.user_profile?.banner_color || "None";
            const accentColorInt = v9Data.user?.accent_color || 3447003; 
            
            // Extract Nitro Profile Theme Colors (Primary & Accent)
            let themeText = "None";
            if (v9Data.user_profile?.theme_colors && v9Data.user_profile.theme_colors.length === 2) {
                const primaryHex = `#${v9Data.user_profile.theme_colors[0].toString(16).padStart(6, '0')}`;
                const accentHex = `#${v9Data.user_profile.theme_colors[1].toString(16).padStart(6, '0')}`;
                themeText = `Primary \`${primaryHex}\` / Accent \`${accentHex}\``;
            }

            // 4. CONNECTIONS EXTRACTION (Spotify, Xbox, GitHub, etc.)
            let connectionsText = "None";
            if (v9Data.connected_accounts && v9Data.connected_accounts.length > 0) {
                connectionsText = v9Data.connected_accounts.map(acc => {
                    // Capitalize the first letter of the platform (e.g., 'spotify' -> 'Spotify')
                    const platform = acc.type.charAt(0).toUpperCase() + acc.type.slice(1);
                    return `**${platform}** (${acc.name})`;
                }).join(', ');
            }

            // 5. BUILD THE V2 CONTAINER UI
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
                                `**Banner Color:** \`${bannerColor}\`\n` +
                                `**Profile Theme:** ${themeText}\n` +
                                `**Connections:** ${connectionsText}\n\n` +
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
