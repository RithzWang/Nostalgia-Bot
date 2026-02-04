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
    description: 'Displays information about a user with Server Tag support',
    // channels: ['1456197056510165026', '1456197056510165029', '1456197056988319870'], 

    async execute(message, args) {
        let tempEmoji = null; // We store the emoji object here to delete it later

        try {
            // ====================================================
            // 1. RESOLVE USER & MEMBER
            // ====================================================
            let targetUser = message.mentions.users.first();
            if (!targetUser && args[0]) {
                try { targetUser = await message.client.users.fetch(args[0], { force: true }); } catch (e) { targetUser = null; }
            }
            if (!targetUser && !args[0]) targetUser = await message.client.users.fetch(message.author.id, { force: true });
            
            // Re-fetch to ensure we get banner/primaryGuild data
            if (targetUser) {
                targetUser = await message.client.users.fetch(targetUser.id, { force: true });
            }

            if (!targetUser) return; 

            let targetMember = null;
            try { targetMember = await message.guild.members.fetch(targetUser.id); } catch (err) { targetMember = null; }

            // ====================================================
            // 2. SERVER TAG (EMOJI CREATION LOGIC)
            // ====================================================
            let serverTagDisplay = "None";
            const guildInfo = targetUser.primaryGuild; 
            
            // Configuration from your snippet
            const storageGuildId = '1468061368098750507';
            // const logChannelId = '1468493795531161650'; // Optional: Use if you want to log creation

            if (guildInfo && guildInfo.tag) {
                // Default to text in case emoji fails
                serverTagDisplay = `**${guildInfo.tag}**`;

                // 1. Get Badge URL
                let badgeURL = null;
                if (typeof targetUser.guildTagBadgeURL === 'function') {
                    badgeURL = targetUser.guildTagBadgeURL({ extension: 'png', size: 128 });
                } else if (guildInfo.badge && guildInfo.identityGuildId) {
                    badgeURL = `https://cdn.discordapp.com/guild-tag-badges/${guildInfo.identityGuildId}/${guildInfo.badge}.png?size=128`;
                }

                // 2. Create Temp Emoji if URL exists
                if (badgeURL) {
                    const storageGuild = message.client.guilds.cache.get(storageGuildId);
                    if (storageGuild) {
                        try {
                            const safeName = `tag_${guildInfo.tag.replace(/[^a-zA-Z0-9]/g, '_')}`;
                            tempEmoji = await storageGuild.emojis.create({ 
                                attachment: badgeURL, 
                                name: safeName 
                            });
                            
                            // 3. Set Display to use the Emoji
                            serverTagDisplay = `${tempEmoji} **${guildInfo.tag}**`;
                        } catch (emojiErr) {
                            console.error("Failed to create temp emoji:", emojiErr);
                        }
                    }
                }
            }

            // ====================================================
            // 3. PREPARE OTHER DATA
            // ====================================================
            const userAvatar = targetUser.displayAvatarURL({ size: 1024, forceStatic: false });
            const userBanner = targetUser.bannerURL({ size: 1024, forceStatic: false });
            const createdTimestamp = `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`;
            
            let memberAvatar = userAvatar;
            let joinedTimestamp = "Not in server";
            let nickname = "None";
            let rolesDisplay = "N/A";
            let joinPosition = "N/A";
            const joinMethod = "Unknown"; 
            const messageCount = "0";

            if (targetMember) {
                if (targetMember.avatar) memberAvatar = targetMember.displayAvatarURL({ size: 1024, forceStatic: false });
                joinedTimestamp = `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>`;
                nickname = targetMember.nickname || targetMember.user.displayName;
                
                const roleSize = targetMember.roles.cache.size - 1; 
                const highestRole = targetMember.roles.highest;
                rolesDisplay = `${roleSize} (Highest: ${highestRole})`;

                const sortedMembers = message.guild.members.cache.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
                const pos = Array.from(sortedMembers.values()).indexOf(targetMember) + 1;
                joinPosition = `${pos}/${message.guild.memberCount}`;
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
                                `<:talk:1468488155106640066> **Messages:** ${messageCount}`
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
            // 6. CLEANUP EMOJI (Wait 5s then Delete)
            // ====================================================
            if (tempEmoji) {
                setTimeout(async () => {
                    try {
                        await tempEmoji.delete();
                    } catch (err) {
                        // Ignore deletion errors (already deleted, etc.)
                        // console.log("Failed to delete temp emoji", err); 
                    }
                }, 5000);
            }

        } catch (error) {
            console.error(error);
            // Cleanup on error just in case
            if (tempEmoji) tempEmoji.delete().catch(() => {});
        }
    }
};
