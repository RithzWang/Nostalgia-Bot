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
    aliases: ['ui', 'user', 'u'],
    description: 'Displays information about a user with Server Tag and Avatar Decorations',
    channels: ['1456197056510165026', '1456197056510165029', '1456197056988319870'], 

    async execute(message, args) {
        let tempEmoji = null; 

        try {
            // ====================================================
            // 1. RESOLVE USER
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
            // 2. SERVER TAG LOGIC (Updated Naming)
            // ====================================================
            let serverTagLine = ""; 
            const guildInfo = targetUser.primaryGuild; 
            const storageGuildId = '1468061368098750507';
            const logChannelId = '1468493795531161650'; 

            if (guildInfo && guildInfo.tag) {
                let tagDisplay = `${guildInfo.tag}`; 
                let badgeURL = null;

                // 1. Generate the Badge URL
                if (typeof targetUser.guildTagBadgeURL === 'function') {
                    badgeURL = targetUser.guildTagBadgeURL({ extension: 'png', size: 128 });
                } else if (guildInfo.badge && guildInfo.identityGuildId) {
                    badgeURL = `https://cdn.discordapp.com/guild-tag-badges/${guildInfo.identityGuildId}/${guildInfo.badge}.png?size=128`;
                }

                // 2. Create Temp Emoji using the Hash from URL as name
                if (badgeURL) {
                    const storageGuild = message.client.guilds.cache.get(storageGuildId);
                    const logChannel = message.client.channels.cache.get(logChannelId);

                    if (storageGuild && logChannel) {
                        try {
                            // 👇 NEW: Extract "78335e9f..." from "https://.../78335e9f....png?size=128"
                            let safeEmojiName = "tag_badge";
                            const hashMatch = badgeURL.match(/\/([a-f0-9]{32})\.png/); 
                            if (hashMatch) {
                                safeEmojiName = hashMatch[1]; // Result: "78335e9f2a73b2074ea68257949eaeae"
                            }

                            tempEmoji = await storageGuild.emojis.create({ 
                                attachment: badgeURL, 
                                name: safeEmojiName 
                            });

                            await logChannel.send({ 
                                content: `**Tag Log:** ${tempEmoji} \`${guildInfo.tag}\`\n**Image Source:** ${badgeURL}` 
                            });
                            tagDisplay = `${tempEmoji} ${guildInfo.tag}`;
                        } catch (emojiErr) {
                            console.error(emojiErr);
                        }
                    }
                }
                serverTagLine = `\n<:badge:1468618581427097724> **Server Tag:** ${tagDisplay}`;
            }

            // ====================================================
            // 3. PREPARE DATA
            // ====================================================
            const userAvatar = targetUser.displayAvatarURL({ size: 1024, forceStatic: false });
            const userBanner = targetUser.bannerURL({ size: 1024, forceStatic: false });
            const userDeco = targetUser.avatarDecorationURL({ size: 1024 }); 
            const createdTimestamp = `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`;
            
            // --- MEMBER DATA ---
            let memberAvatar = message.guild.iconURL({ size: 1024 }); 
            let memberDeco = null;
            let joinedTimestamp = "Not in server";
            let nickname = "None";
            let rolesDisplay = "N/A";
            let joinPosition = "N/A";
            
            if (targetMember) {
                if (targetMember.avatar) memberAvatar = targetMember.displayAvatarURL({ size: 1024, forceStatic: false });
                memberDeco = targetMember.avatarDecorationURL({ size: 1024 });
                
                joinedTimestamp = `<t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>`;
                nickname = targetMember.nickname || "None";
                
                const roleSize = targetMember.roles.cache.size - 1; 
                const highestRole = targetMember.roles.highest;
                rolesDisplay = `${roleSize} (Highest: ${highestRole})`;

                const sortedMembers = message.guild.members.cache.sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);
                const pos = Array.from(sortedMembers.values()).indexOf(targetMember) + 1;
                joinPosition = `${pos}/${message.guild.memberCount}`;
            }

            // Footer Time (GMT+7)
            const now = new Date();
            const footerTime = now.toLocaleString('en-GB', { 
                timeZone: 'Asia/Bangkok', 
                hour12: false,
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            }); 

            // ====================================================
            // 4. BUILD CONTAINER
            // ====================================================
            const container = new ContainerBuilder()
               // .setAccentColor(8947848)
                
                // --- 1. USER SECTION ---
                .addSectionComponents(
                    new SectionBuilder()
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(userAvatar))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("## <:user:1468487542017097873> User Information"),
                            new TextDisplayBuilder().setContent(
                                `<:at:1468487835613925396> ${targetUser.toString()} (\`${targetUser.username}\`)\n` +
                                `<:id:1468487725912166596> **ID:** \`${targetUser.id}\`\n` +
                                `<:identity:1468485794938224807> **Display Name:** ${targetUser.globalName || targetUser.username}\n` +
                                `<:calendar:1470475413175144530> **Account Created:** ${createdTimestamp}` +
                                serverTagLine
                            ),
                        ),
                );

            // --- 2. GLOBAL AVATAR DECORATION ---
            if (userDeco) {
                container.addSectionComponents(
                    new SectionBuilder()
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(userDeco))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**<:star:1468618619318571029> Avatar Decoration:**`)),
                );
            }

            // --- 3. PROFILE BANNER ---
            if (userBanner) {
                container
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent("<:discord:1468638005169229940> **Profile Banner:**"))
                    .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(userBanner)));
            }

            // --- SEPARATOR ---
            container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true));

            // --- 4. SERVER MEMBERSHIP ---
            if (targetMember) {
                const serverSection = new SectionBuilder();
                if (memberAvatar) serverSection.setThumbnailAccessory(new ThumbnailBuilder().setURL(memberAvatar));

                serverSection.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("## <:home:1468487632328589458> Server Membership"),
                    new TextDisplayBuilder().setContent(
                        `<:name:1468486108450127915> **Nickname:** ${nickname}\n` +
                        `<:roles:1468486024089964654> **Roles:** ${rolesDisplay}\n` +
                        `<:calendar:1470475413175144530> **Joined:** ${joinedTimestamp}\n` +
                        `<:location:1468629967956086961> **Join Position:** ${joinPosition}`
                    ),
                );
                container.addSectionComponents(serverSection);

                // --- 5. PER-SERVER DECORATION ---
                if (memberDeco && memberDeco !== userDeco) {
                    container.addSectionComponents(
                        new SectionBuilder()
                            .setThumbnailAccessory(new ThumbnailBuilder().setURL(memberDeco))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**<:star:1468618619318571029> Per-server Avatar Decoration:**`)),
                    );
                }

                // --- 6. PER-SERVER BANNER ---
                const guildBanner = targetMember.bannerURL ? targetMember.bannerURL({ size: 1024 }) : null;
                if (guildBanner) {
                    container
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent("<:discord:1468638005169229940> **Per-server Profile Banner:**"))
                        .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(guildBanner)));
                }
            } else {
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent("-# The user is not in this server."));
            }

            // --- 7. FOOTER ---
            container
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ⏱️ ${footerTime} (GMT+7)`));

            await message.reply({ 
                components: [container], 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.SuppressNotifications],
                allowedMentions: { parse: [], repliedUser: false } 
            });

            if (tempEmoji) {
                setTimeout(async () => { try { await tempEmoji.delete(); } catch (err) {} }, 5000);
            }

        } catch (error) {
            console.error(error);
            if (tempEmoji) tempEmoji.delete().catch(() => {});
        }
    }
};
