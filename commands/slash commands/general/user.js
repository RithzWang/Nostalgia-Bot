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
            // ==========================================
            // 1. FETCH STATIC DATA (Private v9 Scraper)
            // ==========================================
            const v9Data = await fetchAdvancedProfile(userId);
            
            if (!v9Data) {
                return interaction.editReply({ content: "❌ **Error:** Could not fetch data. The Burner Token might be rate-limited." });
            }

            const globalName = v9Data.user?.global_name || v9Data.user?.username;
            const username = v9Data.user?.username;
            const avatarHash = v9Data.user?.avatar;
            const avatarUrl = avatarHash 
                ? `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png?size=1024` 
                : targetUser.displayAvatarURL({ size: 1024, forceStatic: false });
            
            const bioText = v9Data.user_profile?.bio || "No bio set.";
            const badges = v9Data.badges?.map(b => b.description).join(', ') || "None";
            const bannerColor = v9Data.user_profile?.banner_color || "None";
            const accentColorInt = v9Data.user?.accent_color || 3447003; 
            
            let themeText = "None";
            if (v9Data.user_profile?.theme_colors && v9Data.user_profile.theme_colors.length === 2) {
                const primaryHex = `#${v9Data.user_profile.theme_colors[0].toString(16).padStart(6, '0')}`;
                const accentHex = `#${v9Data.user_profile.theme_colors[1].toString(16).padStart(6, '0')}`;
                themeText = `Primary \`${primaryHex}\` / Accent \`${accentHex}\``;
            }

            let connectionsText = "None";
            if (v9Data.connected_accounts && v9Data.connected_accounts.length > 0) {
                connectionsText = v9Data.connected_accounts.map(acc => {
                    const platform = acc.type.charAt(0).toUpperCase() + acc.type.slice(1);
                    return `**${platform}** (${acc.name})`;
                }).join(', ');
            }

            const avatarDeco = v9Data.user?.avatar_decoration_data;
            const decoText = avatarDeco && avatarDeco.asset ? `[View Decoration](https://cdn.discordapp.com/avatar-decoration-presets/${avatarDeco.asset}.png)` : "None";
            const hasProfileEffect = v9Data.user_profile?.profile_effect ? "Active ✨" : "None";

            // ==========================================
            // 2. FETCH LIVE PRESENCE (Native discord.js Cache)
            // ==========================================
            let statusText = "Offline / Invisible";
            let deviceText = "None";
            let activityText = "None";

            // Sweep all mutual servers to find their live Gateway presence
            let presence = null;
            for (const guild of interaction.client.guilds.cache.values()) {
                presence = guild.presences.cache.get(userId);
                if (presence) break; 
            }

            if (presence && presence.status) {
                statusText = presence.status.charAt(0).toUpperCase() + presence.status.slice(1);
                
                if (presence.clientStatus) {
                    const devices = Object.keys(presence.clientStatus);
                    if (devices.length > 0) {
                        deviceText = devices.map(d => d.charAt(0).toUpperCase() + d.slice(1)).join(', ');
                    }
                }

                const customStatus = presence.activities.find(act => act.type === 4); 
                if (customStatus) {
                    const emoji = customStatus.emoji?.name ? `${customStatus.emoji.name} ` : "";
                    const state = customStatus.state || "";
                    activityText = `${emoji}${state}`.trim() || "None";
                }
            }

            // ==========================================
            // 3. BUILD THE V2 CONTAINER UI
            // ==========================================
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
                                `**Avatar Decoration:** ${decoText}\n` +
                                `**Profile Effect:** ${hasProfileEffect}\n` +
                                `**Connections:** ${connectionsText}\n` +
                                `**Status:** ${statusText}\n` +
                                `**Device:** ${deviceText}\n` +
                                `**Activity:** ${activityText}\n\n` +
                                `**Bio:**\n${bioText}`
                            )
                        )
                )
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# Data provided by v9 API & Discord Gateway • <t:${Math.floor(Date.now() / 1000)}:R>`));

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
