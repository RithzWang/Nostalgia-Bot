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

module.exports = {
    name: 'userinfo',
    aliases: ['ui', 'user'],
    description: 'Displays information about a user with Server Tag, Join Method, and Message Stats',
    channels: ['1456197056510165026', '1456197056510165029', '1456197056988319870'], 

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

            if (!targetUser) return; 

            let targetMember = null;
            try { targetMember = await message.guild.members.fetch(targetUser.id); } catch (err) { targetMember = null; }

            // ====================================================
            // 2. SERVER TAG (LOGIC + LOGGING)
            // ====================================================
            let serverTagDisplay = "None";
            const guildInfo = targetUser.primaryGuild; 
            
            const storageGuildId = '1468061368098750507';
            const logChannelId = '1468493795531161650'; 

            if (guildInfo && guildInfo.tag) {
                serverTagDisplay = `${guildInfo.tag}`;

                let badgeURL = null;
                let badgeName = "tag_badge"; 

                if (typeof targetUser.guildTagBadgeURL === 'function') {
                    badgeURL = targetUser.guildTagBadgeURL({ extension: 'png', size: 128 });
                } else if (guildInfo.badge && guildInfo.identityGuildId) {
                    badgeURL = `https://cdn.discordapp.com/guild-tag-badges/${guildInfo.identityGuildId}/${guildInfo.badge}.png?size=128`;
                    badgeName = guildInfo.badge; 
                }

                if (badgeURL) {
                    const storageGuild = message.client.guilds.cache.get(storageGuildId);
                    const logChannel = message.client.channels.cache.get(logChannelId);

                    if (storageGuild && logChannel) {
                        try {
                            const safeEmojiName = badgeName.replace(/[^a-zA-Z0-9_]/g, '');
                            
                            // A. Create
                            tempEmoji = await storageGuild.emojis.create({ 
                                attachment: badgeURL, 
                                name: safeEmojiName 
                            });
                            
                            // B. Log
                            await logChannel.send({ content: `${tempEmoji}` });

                            // C. Display
                            serverTagDisplay = `${tempEmoji} **${guildInfo.tag}**`;

                        } catch (emojiErr) {
                            console.error("Failed to process temp emoji:", emojiErr);
                        }
                    }
                }
            }

            // ====================================================
            // 3. PREPARE USER DATA
            // ====================================================
            const userAvatar = targetUser.displayAvatarURL({ size: 1024, forceStatic: false });
            const userBanner = targetUser.bannerURL({ size: 1024, forceStatic: false });
            const createdTimestamp = `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`;
            
            let memberAvatar = userAvatar;
            let joinedTimestamp = "Not in server";
            let nickname = "None";
            let rolesDisplay = "N/A";
            let joinPosition = "N/A";
            let joinMethod = "Unknown"; 
            
            // --- MESSAGE STATS (Placeholder) ---
            // Note: You must connect a database (MongoDB/SQL) to fill these numbers.
            // Discord API does not allow fetching old message counts.
            const stats = { total: 0, month: 0, week: 0, today: 0 }; 
            // Example: const stats = await db.getMessages(targetUser.id, message.guild.id);
            
            const messageStatsDisplay = `${stats.total} (Month: ${stats.month} | Week: ${stats.week} | Today: ${stats.today})`;

            if (targetMember) {
                if (targetMember.avatar) memberAvatar = targetMember.displayAvatarURL({ size: 1024, forceStatic: false });
                joinedTimestamp = `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>`;
                nickname = targetMember.nickname || targetMember.user.displayName;
                
                const roleSize = targetMember.roles.cache.size - 1; 
                const highestRole = targetMember.roles.highest;
                rolesDisplay = `${roleSize} (Highest: ${highestRole})`;

                // Join Position
                const sortedMembers = message.guild.members.cache.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
                const pos = Array.from(sortedMembers.values()).indexOf(targetMember) + 1;
                joinPosition = `${pos}/${message.guild.memberCount}`;

                // --- JOIN METHOD LOGIC ---
                if (targetUser.bot) {
                    joinMethod = `[OAuth2 / Bot Add](https://discord.com/oauth2/authorize?client_id=${targetUser.id})`;
                } else if (targetUser.id === message.guild.ownerId) {
                    joinMethod = `**Server Creator**`;
                } else if (message.guild.vanityURLCode) {
                    joinMethod = `[Vanity: ${message.guild.vanityURLCode}](https://discord.gg/${message.guild.vanityURLCode})`;
                } else {
                    joinMethod = `Standard Invite / Discovery`;
                }
            }

            // ====================================================
            // 4. BUILD CONTAINER
            // ====================================================
            const container = new ContainerBuilder()
                .setAccentColor(8947848)
                // USER HEADER
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("# <:user:1468487542017097873> User Information"),
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false),
                )
                // USER SECTION
                .addSectionComponents(
                    new SectionBuilder()
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(userAvatar))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `<:id:1468487725912166596> **ID:** \`${targetUser.id}\`\n` +
                                `<:at:1468487835613925396> ${targetUser.toString()} \`(${targetUser.username})\`\n` +
                                `<:identity:1468485794938224807> **Display Name:** ${targetUser.globalName || targetUser.username}\n` +
                                `<:calender:1468485942137323630> **Joined Discord:** ${createdTimestamp}\n` +
                                `<:sparkles:1468470437838192651> **Server Tag:** ${serverTagDisplay}`
                            ),
                        ),
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false),
                );

            if (userBanner) {
                container.addMediaGalleryComponents(
                    new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(userBanner)),
                );
            }

            // SERVER HEADER
            container
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true),
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("# <:home:1468487632328589458> Server Membership"),
                )
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false),
                );

            if (targetMember) {
                container.addSectionComponents(
                    new SectionBuilder()
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(memberAvatar))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `<:name:1468486108450127915> **Nickname:** ${nickname}\n` +
                                `<:roles:1468486024089964654> **Roles:** ${rolesDisplay}\n` +
                                `<:calender:1468485942137323630> **Joined:** ${joinedTimestamp}\n` +
                                `<:pin:1468487912986382396> **Join Position:** ${joinPosition}\n` +
                                `<:position_right:1468488077692502026> **Join Method:** ${joinMethod}\n` +
                                `<:talk:1468488155106640066> **Messages:** ${messageStatsDisplay}`
                            ),
                        ),
                );
                
                const guildBanner = targetMember.bannerURL ? targetMember.bannerURL({ size: 1024 }) : null;
                if (guildBanner) {
                    container
                        .addSeparatorComponents(
                            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false),
                        )
                        .addMediaGalleryComponents(
                            new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(guildBanner)),
                        );
                }
            } else {
                container.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("**User is not in this server.**")
                );
            }

            // ====================================================
            // 5. SEND REPLY
            // ====================================================
            await message.reply({ 
                components: [container], 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.SuppressNotifications],
                allowedMentions: { parse: [], repliedUser: false } 
            });

            // ====================================================
            // 6. CLEANUP (Wait 5s then Delete)
            // ====================================================
            if (tempEmoji) {
                setTimeout(async () => {
                    try {
                        await tempEmoji.delete();
                    } catch (err) {
                        // console.log("Failed to delete temp emoji", err); 
                    }
                }, 5000);
            }

        } catch (error) {
            console.error(error);
            if (tempEmoji) tempEmoji.delete().catch(() => {});
        }
    }
};
