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
    description: 'Displays information about a user with Server Tag and Avatar Decorations',
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
            // 2. SERVER TAG LOGIC
            // ====================================================
            let serverTagDisplay = "None";
            const guildInfo = targetUser.primaryGuild; 
            
            const storageGuildId = '1468061368098750507';
            const logChannelId = '1468493795531161650'; 

            if (guildInfo && guildInfo.tag) {
                serverTagDisplay = `**${guildInfo.tag}**`;

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
                            tempEmoji = await storageGuild.emojis.create({ 
                                attachment: badgeURL, 
                                name: safeEmojiName 
                            });
                            
                            // 👇 CHANGED: Now sends the emoji + the permanent link to the image
                            await logChannel.send({ 
                                content: `**Tag Log:** ${tempEmoji} \`${guildInfo.tag}\`\n**Image Source:** ${badgeURL}` 
                            });
                            
                            serverTagDisplay = `${tempEmoji} **${guildInfo.tag}**`;
                        } catch (emojiErr) {
                            console.error("Failed to process temp emoji:", emojiErr);
                        }
                    }
                }
            }

            // ====================================================
            // 3. PREPARE DATA
            // ====================================================
            const userAvatar = targetUser.displayAvatarURL({ size: 1024, forceStatic: false });
            const userBanner = targetUser.bannerURL({ size: 1024, forceStatic: false });
            const userDeco = targetUser.avatarDecorationURL({ size: 1024 }); 
            const createdTimestamp = `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`;
            
            // --- MEMBER SPECIFIC DATA ---
            let memberAvatar = message.guild.iconURL({ size: 1024 }); // Default to Server Icon
            let memberDeco = null;
            let joinedTimestamp = "Not in server";
            let nickname = "None";
            let rolesDisplay = "N/A";
            let joinPosition = "N/A";
            let joinMethod = "Unknown"; 
            const stats = { total: 0, month: 0, week: 0, today: 0 }; 
            const messageStatsDisplay = `${stats.total} (Month: ${stats.month} | Week: ${stats.week} | Today: ${stats.today})`;

            if (targetMember) {
                // 1. Avatar: Prefer Server Avatar > Server Icon
                if (targetMember.avatar) {
                    memberAvatar = targetMember.displayAvatarURL({ size: 1024, forceStatic: false });
                }
                
                // 2. Decoration: Check for Per-Server Decoration
                memberDeco = targetMember.avatarDecorationURL({ size: 1024 });

                joinedTimestamp = `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>`;
                nickname = targetMember.nickname || targetMember.user.displayName;
                
                const roleSize = targetMember.roles.cache.size - 1; 
                const highestRole = targetMember.roles.highest;
                rolesDisplay = `${roleSize} (Highest: ${highestRole})`;

                const sortedMembers = message.guild.members.cache.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
                const pos = Array.from(sortedMembers.values()).indexOf(targetMember) + 1;
                joinPosition = `${pos}/${message.guild.memberCount}`;

                if (targetUser.bot) joinMethod = `[OAuth2 / Bot Add](https://discord.com/oauth2/authorize?client_id=${targetUser.id})`;
                else if (targetUser.id === message.guild.ownerId) joinMethod = `**Server Creator**`;
                else if (message.guild.vanityURLCode) joinMethod = `[Vanity: ${message.guild.vanityURLCode}](https://discord.gg/${message.guild.vanityURLCode})`;
                else joinMethod = `Standard Invite / Discovery`;
            }

            // ====================================================
            // 4. BUILD CONTAINER
            // ====================================================
            const container = new ContainerBuilder()
                .setAccentColor(8947848)
                
                // --- USER SECTION ---
                .addSectionComponents(
                    new SectionBuilder()
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(userAvatar))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("## <:user:1468487542017097873> User Information"),
                            new TextDisplayBuilder().setContent(
                                `<:id:1468487725912166596> **ID:** \`${targetUser.id}\`\n` +
                                `<:at:1468487835613925396> ${targetUser.toString()} (\`${targetUser.username}\`)\n` +
                                `<:identity:1468485794938224807> **Display Name:** ${targetUser.globalName || targetUser.username}\n` +
                                `<:calender:1468485942137323630> **Account Created:** ${createdTimestamp}\n` +
                                `<:sparkles:1468470437838192651> **Server Tag:** ${serverTagDisplay}`
                            ),
                        ),
                );

            // --- GLOBAL DECORATION ---
            if (userDeco) {
                container.addSectionComponents(
                    new SectionBuilder()
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(userDeco))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`### <:sparkles:1468470437838192651> Avatar Decoration: [Link](${userDeco})`),
                        ),
                );
            }

            // --- USER BANNER ---
            if (userBanner) {
                container
                    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
                    .addMediaGalleryComponents(
                        new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(userBanner)),
                    );
            }

            // --- SEPARATOR ---
            container.addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true),
            );

            // --- SERVER SECTION ---
            if (targetMember) {
                const serverSection = new SectionBuilder();
                if (memberAvatar) serverSection.setThumbnailAccessory(new ThumbnailBuilder().setURL(memberAvatar));

                serverSection.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("## <:home:1468487632328589458> Server Membership"),
                    new TextDisplayBuilder().setContent(
                        `<:name:1468486108450127915> **Nickname:** ${nickname}\n` +
                        `<:roles:1468486024089964654> **Roles:** ${rolesDisplay}\n` +
                        `<:calender:1468485942137323630> **Joined:** ${joinedTimestamp}\n` +
                        `<:pin:1468487912986382396> **Join Position:** ${joinPosition}\n` +
                        `<:position_right:1468488077692502026> **Join Method:** ${joinMethod}\n` +
                        `<:talk:1468488155106640066> **Messages:** ${messageStatsDisplay}`
                    ),
                );
                container.addSectionComponents(serverSection);

                // --- SERVER SPECIFIC DECORATION ---
                // Only show if different from global or explicitly set
                if (memberDeco && memberDeco !== userDeco) {
                    container.addSectionComponents(
                        new SectionBuilder()
                            .setThumbnailAccessory(new ThumbnailBuilder().setURL(memberDeco))
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(`### <:sparkles:1468470437838192651> Server Decoration: [Link](${memberDeco})`),
                            ),
                    );
                }

                const guildBanner = targetMember.bannerURL ? targetMember.bannerURL({ size: 1024 }) : null;
                if (guildBanner) {
                    container
                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false))
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
            // 5. SEND & CLEANUP
            // ====================================================
            await message.reply({ 
                components: [container], 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.SuppressNotifications],
                allowedMentions: { parse: [], repliedUser: false } 
            });

            if (tempEmoji) {
                setTimeout(async () => {
                    try { await tempEmoji.delete(); } catch (err) {}
                }, 5000);
            }

        } catch (error) {
            console.error(error);
            if (tempEmoji) tempEmoji.delete().catch(() => {});
        }
    }
};
