const { 
    ContainerBuilder, 
    MessageFlags, 
    SeparatorSpacingSize,
    TextDisplayBuilder,      
    SeparatorBuilder,        
    MediaGalleryBuilder,     
    MediaGalleryItemBuilder, 
    SectionBuilder,
    ThumbnailBuilder
} = require('discord.js');

// 🛠️ Make sure this path points to your actual scraper file!
const { fetchAdvancedProfile } = require('../../../utils/v9Scraper'); 

module.exports = {
    name: 'userinfo',
    aliases: ['ui', 'user', 'u'],
    description: 'Displays information about a user with Server Tag and Avatar Decorations',

    async execute(message, args) {
        let tempEmoji = null; 

        try {
            // ====================================================
            // 1. RESOLVE USER & MEMBER
            // ====================================================
            let targetUser = message.mentions.users.first();
            if (!targetUser && args[0]) {
                try { targetUser = await message.client.users.fetch(args[0], { force: true }); } catch (e) { targetUser = null; }
            }
            if (!targetUser && !args[0]) targetUser = await message.client.users.fetch(message.author.id, { force: true });
            
            if (targetUser) {
                targetUser = await message.client.users.fetch(targetUser.id, { force: true });
            }

            if (!targetUser) return message.reply("❌ User not found."); 

            let targetMember = null;
            try { targetMember = await message.guild.members.fetch(targetUser.id); } catch (err) { targetMember = null; }

            // ====================================================
            // 2. FETCH V9 ADVANCED DATA
            // ====================================================
            const v9Data = await fetchAdvancedProfile(targetUser.id).catch(() => null);

            let badgesText = null;
            let connectionsText = null;
            let nitroText = null;
            let colorString = null;

            if (v9Data) {
                // Badges
                if (v9Data.badges && v9Data.badges.length > 0) {
                    badgesText = v9Data.badges.map(b => b.description).join(', ');
                }

                // Connections
                if (v9Data.connected_accounts && v9Data.connected_accounts.length > 0) {
                    connectionsText = v9Data.connected_accounts.map(acc => {
                        return acc.type.charAt(0).toUpperCase() + acc.type.slice(1);
                    }).join(', ');
                }

                // Nitro Type
                if (v9Data.user?.premium_type === 1) nitroText = "Nitro Classic";
                else if (v9Data.user?.premium_type === 2) nitroText = "Nitro";
                else if (v9Data.user?.premium_type === 3) nitroText = "Nitro Basic";

                // Profile Theme OR Banner Color
                if (v9Data.user_profile?.theme_colors && v9Data.user_profile.theme_colors.length === 2) {
                    const primaryHex = `#${v9Data.user_profile.theme_colors[0].toString(16).padStart(6, '0').toUpperCase()}`;
                    const accentHex = `#${v9Data.user_profile.theme_colors[1].toString(16).padStart(6, '0').toUpperCase()}`;
                    colorString = `<:colours:1519455969078411285> **Profile Theme:**\nPrimary: \`${primaryHex}\`, Accent: \`${accentHex}\``;
                } else if (v9Data.user?.accent_color) {
                    const accentHex = `#${v9Data.user.accent_color.toString(16).padStart(6, '0').toUpperCase()}`;
                    colorString = `<:colours:1519455969078411285> **Banner Colour:** \`${accentHex}\``;
                }
            }

            // ====================================================
            // 3. SERVER TAG LOGIC
            // ====================================================
            let serverTagLine = null; 
            const guildInfo = targetUser.primaryGuild; 
            const storageGuildId = '1490435762372481275';
            const logChannelId = '1490435899723612210'; 

            if (guildInfo && guildInfo.tag) {
                let tagDisplay = `${guildInfo.tag}`; 
                let badgeURL = null;

                if (typeof targetUser.guildTagBadgeURL === 'function') {
                    badgeURL = targetUser.guildTagBadgeURL({ extension: 'png', size: 128 });
                } else if (guildInfo.badge && guildInfo.identityGuildId) {
                    badgeURL = `https://cdn.discordapp.com/guild-tag-badges/${guildInfo.identityGuildId}/${guildInfo.badge}.png?size=128`;
                }

                if (badgeURL) {
                    const storageGuild = message.client.guilds.cache.get(storageGuildId);
                    const logChannel = message.client.channels.cache.get(logChannelId);

                    if (storageGuild && logChannel) {
                        try {
                            let safeEmojiName = "tag_badge";
                            const hashMatch = badgeURL.match(/\/([a-f0-9]{32})\.png/); 
                            if (hashMatch) safeEmojiName = hashMatch[1]; 

                            tempEmoji = await storageGuild.emojis.create({ 
                                attachment: badgeURL, 
                                name: safeEmojiName 
                            });

                            await logChannel.send({ 
                                content: `**Tag Log:** ${tempEmoji} \`${guildInfo.tag}\`\n**Image Source:** ${badgeURL}` 
                            });
                            tagDisplay = `${tempEmoji} ${guildInfo.tag}`;
                        } catch (emojiErr) {
                            console.error("Temp Emoji Error:", emojiErr);
                        }
                    }
                }
                serverTagLine = `${tagDisplay}`;
            }

            // ====================================================
            // 4. PREPARE STATIC DATA
            // ====================================================
            const userAvatar = targetUser.displayAvatarURL({ size: 1024, forceStatic: false });
            const userBanner = targetUser.bannerURL({ size: 1024, forceStatic: false });
            const userDeco = targetUser.avatarDecorationURL({ size: 1024 }); 
            const createdTimestamp = `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`;

            // --- BUILD USER TEXT BLOCK ---
            let userInfoText = `<:at:1468487835613925396> **@${targetUser.username}** (\`${targetUser.username}\`)\n` +
                               `<:id:1468487725912166596> **ID:** \`${targetUser.id}\`\n` +
                               `<:identity:1468485794938224807> **Display Name:** \`${targetUser.globalName || targetUser.username}\`\n` +
                               `<:calendar:1470475413175144530> **Account Created:** ${createdTimestamp}`;

            if (badgesText) userInfoText += `\n<:star_circle:1468623218574098502> **Badge:** ${badgesText}`;
            if (serverTagLine) userInfoText += `\n<:badge:1468618581427097724> **Server Tag:** ${serverTagLine}`;
            if (connectionsText) userInfoText += `\n<:connection:1468633345876431021> **Connection:** ${connectionsText}`;
            if (nitroText) userInfoText += `\n<:nitro:1468618658388512809> **Nitro Type:** ${nitroText}`;
            
            // Checking Boost Status if they are in the server
            if (targetMember && targetMember.premiumSinceTimestamp) {
                userInfoText += `\n<:server_boost:1468633171758284872> **Boosting Since:** <t:${Math.floor(targetMember.premiumSinceTimestamp / 1000)}:R>`;
            }

            if (colorString) userInfoText += `\n${colorString}`;

            // Footer Time (GMT+7)
            const now = new Date();
            const footerUnix = `<t:${Math.floor(now.getTime() / 1000)}:f>`;
            const footerText = `-# ${footerUnix}, By: **@${message.author.username}** (ID: \`${message.author.id}\`)`;

            // ====================================================
            // 5. BUILD CONTAINER
            // ====================================================
            const container = new ContainerBuilder();

            // 🟢 SECTION 1: GLOBAL USER INFO
            container.addSectionComponents(
                new SectionBuilder()
                    .setThumbnailAccessory(new ThumbnailBuilder().setURL(userAvatar))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("## <:user:1468487542017097873> User Information"),
                        new TextDisplayBuilder().setContent(userInfoText)
                    )
            );

            if (userDeco) {
                container.addSectionComponents(
                    new SectionBuilder()
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(userDeco))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**<:star:1468618619318571029> Avatar Decoration:**`))
                );
            }

            if (userBanner) {
                container
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent("<:discord:1468638005169229940> **Profile Banner:**"))
                    .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(userBanner)));
            }

            // 🟢 SECTION 2: IN-SERVER SPECIFIC LOGIC
            if (targetMember) {
                container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true));

                let memberAvatar = targetMember.avatar ? targetMember.displayAvatarURL({ size: 1024, forceStatic: false }) : message.guild.iconURL({ size: 1024 });
                let memberDeco = targetMember.avatarDecorationURL({ size: 1024 });
                let guildBanner = targetMember.bannerURL ? targetMember.bannerURL({ size: 1024 }) : null;

                const joinedTimestamp = `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>`;
                const nickname = targetMember.nickname || "None";
                const roleSize = targetMember.roles.cache.size > 1 ? targetMember.roles.cache.size - 1 : 0; 
                const highestRole = targetMember.roles.highest;

                const sortedMembers = message.guild.members.cache.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
                const pos = Array.from(sortedMembers.values()).indexOf(targetMember) + 1;
                const joinPosition = `${pos}/${message.guild.memberCount}`;

                // 🛠️ PLACEHOLDERS (Plug your database variables here later!)
                const joinMethodText = `[` + `Invite Link` + `](<https://discord.gg/Unknown>) (**@UnknownInviter**)`;
                const msgTotal = 0;
                const msgMonth = 0;
                const msgWeek = 0;
                const msgToday = 0;

                // Build Server Membership Block
                const serverSection = new SectionBuilder();
                if (memberAvatar) serverSection.setThumbnailAccessory(new ThumbnailBuilder().setURL(memberAvatar));

                serverSection.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("## <:home:1468487632328589458> Server Membership"),
                    new TextDisplayBuilder().setContent(
                        `<:name:1468486108450127915> **Nickname:** ${nickname}\n` +
                        `<:roles:1468486024089964654> **Roles:** ${roleSize} (Highest: **@${highestRole.name}**)\n` +
                        `<:calendar:1470475413175144530> **Joined:** ${joinedTimestamp}\n` +
                        `<:location:1468629967956086961> **Join Position:** ${joinPosition}\n` +
                        `<:position_right:1468488077692502026> **Join Method:** ${joinMethodText}\n` +
                        `<:talk:1468488155106640066> **Messages:** \`${msgTotal}\` (this month: \`${msgMonth}\` | this week: \`${msgWeek}\` | today: \`${msgToday}\`) (<:time:1468625930074460394> GMT+7)`
                    )
                );
                container.addSectionComponents(serverSection);

                if (memberDeco && memberDeco !== userDeco) {
                    container.addSectionComponents(
                        new SectionBuilder()
                            .setThumbnailAccessory(new ThumbnailBuilder().setURL(memberDeco))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**<:star:1468618619318571029> Per-server Avatar Decoration:**`))
                    );
                }

                if (guildBanner) {
                    container
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent("<:discord:1468638005169229940> **Per-server Profile Banner:**"))
                        .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(guildBanner)));
                }

                // ====================================================
                // 🟢 SECTION 3: PRESENCE & STATUS (Only if in server)
                // ====================================================
                container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true));

                const presence = message.guild.presences.cache.get(targetUser.id);
                
                // Device Logic
                let deviceIcons = [];
                if (presence?.clientStatus?.desktop) deviceIcons.push(`<:desktop:1519456094915792916> **Device:** Desktop`);
                if (presence?.clientStatus?.mobile) deviceIcons.push(`<:mobile:1519456126276472832> **Device:** Mobile`);
                if (presence?.clientStatus?.web) deviceIcons.push(`🌐 **Device:** Web`);
                const deviceText = deviceIcons.length > 0 ? deviceIcons.join(' / ') : "Offline";

                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## <:status:1519456062720446565> Presence Information\n${deviceText}`)
                );

                if (presence) {
                    // Standard Activity (Playing / Listening)
                    const activity = presence.activities.find(act => act.type !== 4);
                    if (activity) {
                        const actSection = new SectionBuilder();
                        
                        // Extract Activity Image (Spotify or Game Asset)
                        let actImage = null;
                        if (activity.name === 'Spotify' && activity.assets?.largeImage) {
                            actImage = `https://i.scdn.co/image/${activity.assets.largeImage.replace('spotify:', '')}`;
                        } else if (activity.assets?.largeImage) {
                            // Extract raw asset ID from Discord's internal format
                            const assetId = activity.assets.largeImage.split(':')[1] || activity.assets.largeImage;
                            actImage = `https://cdn.discordapp.com/app-assets/${activity.applicationId}/${assetId}.png`;
                        }

                        if (actImage) actSection.setThumbnailAccessory(new ThumbnailBuilder().setURL(actImage));

                        let actTypeString = "Playing";
                        if (activity.type === 2) actTypeString = "Listening to";
                        else if (activity.type === 3) actTypeString = "Watching";
                        else if (activity.type === 5) actTypeString = "Competing in";

                        let actContent = `<:activity:1519456032772980776> **Activity:** (${actTypeString} **${activity.name}**)`;
                        if (activity.details) actContent += `\n-# **${activity.name === 'Spotify' ? 'Song' : 'Details'}:** ${activity.details}`;
                        if (activity.state) actContent += `\n-# **${activity.name === 'Spotify' ? 'Artist' : 'State'}:** ${activity.state}`;
                        if (activity.assets?.largeText && activity.name === 'Spotify') actContent += `\n-# **Album:** ${activity.assets.largeText}`;

                        actSection.addTextDisplayComponents(new TextDisplayBuilder().setContent(actContent));
                        container.addSectionComponents(actSection);
                    }

                    // Custom Status
                    const customStatus = presence.activities.find(act => act.type === 4);
                    if (customStatus) {
                        const statusSection = new SectionBuilder();
                        
                        let statusEmojiUrl = null;
                        if (customStatus.emoji) {
                            if (customStatus.emoji.id) {
                                statusEmojiUrl = `https://cdn.discordapp.com/emojis/${customStatus.emoji.id}.${customStatus.emoji.animated ? 'gif' : 'png'}`;
                            } else if (customStatus.emoji.name) {
                                // Default unicode emojis don't have standard CDN links, but you can leave this blank or use a twemoji parser if preferred
                            }
                        }

                        if (statusEmojiUrl) statusSection.setThumbnailAccessory(new ThumbnailBuilder().setURL(statusEmojiUrl));

                        const stateText = customStatus.state || "";
                        statusSection.addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`<:customstatus:1519456000963252294> **Custom Status:**\n-# **State:** ${stateText}`)
                        );
                        container.addSectionComponents(statusSection);
                    }
                }
            } else {
                // If they are not in the server, fallback to this!
                container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true));
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent("-# The user is not in this server."));
            }

            // ====================================================
            // 🟢 SECTION 4: FOOTER
            // ====================================================
            container
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(footerText));

            await message.reply({ 
                components: [container], 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.SuppressNotifications],
                allowedMentions: { parse: [], repliedUser: false } 
            });

            if (tempEmoji) {
                setTimeout(async () => { try { await tempEmoji.delete(); } catch (err) {} }, 5000);
            }

        } catch (error) {
            console.error("Userinfo Error:", error);
            if (tempEmoji) tempEmoji.delete().catch(() => {});
        }
    }
};
