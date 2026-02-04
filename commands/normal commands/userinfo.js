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
            // 1. RESOLVE USER (FORCE FETCH)
            // ====================================================
            let targetUser = message.mentions.users.first();
            if (!targetUser && args[0]) {
                try { targetUser = await message.client.users.fetch(args[0], { force: true }); } catch (e) { targetUser = null; }
            }
            if (!targetUser && !args[0]) targetUser = await message.client.users.fetch(message.author.id, { force: true });
            
            // Critical: Force fetch to ensure flags/banner are loaded
            if (targetUser) {
                targetUser = await message.client.users.fetch(targetUser.id, { force: true });
            }

            if (!targetUser) return; 

            let targetMember = null;
            try { targetMember = await message.guild.members.fetch(targetUser.id); } catch (err) { targetMember = null; }

            // ====================================================
            // 2. SERVER TAG LOGIC
            // ====================================================
            let serverTagLine = ""; 
            const guildInfo = targetUser.primaryGuild; 
            const storageGuildId = '1468061368098750507';
            const logChannelId = '1468493795531161650'; 

            if (guildInfo && guildInfo.tag) {
                let tagDisplay = `${guildInfo.tag}`; 
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
                            await logChannel.send({ 
                                content: `**Tag Log:** ${tempEmoji} \`${guildInfo.tag}\`\n**Image Source:** ${badgeURL}` 
                            });
                            tagDisplay = `${tempEmoji} ${guildInfo.tag}`;
                        } catch (emojiErr) {}
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
            
            // --- BADGES MAPPING (Updated with your list) ---
            const badgeMap = {
                // User Badges
                Staff: '<:discord_staff:1468521557075689556>',
                Partner: '<:partner4:1468521552638382292>',
                HypeSquad: '<:hypesquadevents:1468521524725157939>',
                BugHunterLevel1: '<:bughuntergreen:1468521502377906328>',
                BugHunterLevel2: '<:bughuntergold:1468521499160739841>',
                HypeSquadOnlineHouse1: '<:hypesquadbravery:1468521511353843748>',
                HypeSquadOnlineHouse2: '<:hypesquadbrilliance:1468521513656258634>',
                HypeSquadOnlineHouse3: '<:hypesquadbalance:1468521509462081597>',
                PremiumEarlySupporter: '<:earlysupporter:1468521504307150848>',
                VerifiedDeveloper: '<:earlyverifiedbotdeveloper:1468521505762574485>',
                ActiveDeveloper: '<:activedeveloper:1468521914107428937>',
                ModeratorProgramsAlumni: '<:modold:1468521531603943476>',
                
                // Bot Badges (Mapped via flags)
                BotHTTPInteractions: '<:slash:1468653349627891752>', // Supports Commands
                // These often need bitfield checks (see below) but we map keys if they appear
                ApplicationCommandBadge: '<:slash:1468653349627891752>',
                ApplicationAutoModerationRuleCreateBadge: '<:uses_automod:1468521528424402976>',
                QuestsCompleted: '<:quest:1468521554605379617>' 
            };

            const userFlags = targetUser.flags ? targetUser.flags.toArray() : [];
            let badgeList = userFlags.map(flag => badgeMap[flag]).filter(Boolean);

            // Manual Checks for specific badges not always in .toArray()
            // 1. "Uses Automod" (Bitflag: 1 << 6)
            if (targetUser.bot) {
                const flags = targetUser.flags.bitfield;
                if ((flags & (1 << 6)) !== 0) badgeList.push('<:uses_automod:1468521528424402976>'); 
                // "Premium App" usually doesn't have a public flag on the User object, but if you have logic for it:
                // badgeList.push('<:premium_app:1468653351863582842>'); 
            }

            // 2. "Originally Known As" (Legacy Username)
            // Logic: Migrated user usually has discriminator '0'
            if (targetUser.discriminator === '0' && !targetUser.bot) {
                badgeList.push('<:username:1468521559202201623>');
            }

            // 3. "Orb" Badge (Custom/Event) - Add manually if needed or based on specific logic
            // badgeList.push('<:orbs:1468521551065256063>'); 

            // --- MEMBER DATA ---
            let memberAvatar = message.guild.iconURL({ size: 1024 }); 
            let memberDeco = null;
            let joinedTimestamp = "Not in server";
            let nickname = "None";
            let rolesDisplay = "N/A";
            let joinPosition = "N/A";
            
            // --- NITRO & BOOST VARIABLES ---
            let boostingLine = "";
            let nitroTypeLine = ""; 
            let subscriberSinceLine = "";

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

                // --- NITRO & BOOST CALCULATION ---
                if (targetMember.premiumSinceTimestamp) {
                    const now = Date.now();
                    const boostedAt = targetMember.premiumSinceTimestamp;
                    const months = Math.floor((now - boostedAt) / (1000 * 60 * 60 * 24 * 30));
                    const timestampDisplay = `<t:${Math.floor(boostedAt / 1000)}:R>`;

                    // Boost Badge (Pink)
                    let boostEmoji = '<:boost1m:1468521487202783346>'; 
                    if (months >= 24) boostEmoji = '<:bost24m:1468521497101340769>';
                    else if (months >= 18) boostEmoji = '<:boost18m:1468521485659537577>';
                    else if (months >= 15) boostEmoji = '<:boost15m:1468521482949890088>';
                    else if (months >= 12) boostEmoji = '<:boost12m:1468521480852733965>';
                    else if (months >= 9)  boostEmoji = '<:boost9m:1468521495058972672>';
                    else if (months >= 6)  boostEmoji = '<:boost6m:1468521492500316370>';
                    else if (months >= 3)  boostEmoji = '<:boost3m:1468521490541707346>';
                    else if (months >= 2)  boostEmoji = '<:boost2m:1468521488704602268>';

                    // Nitro Evolution Badge (Subscriber)
                    let nitroEvoEmoji = '<:nitro:1468521533659156480>'; 
                    if (months >= 72) nitroEvoEmoji = '<:nitroopal:1468521541368152179>';
                    else if (months >= 60) nitroEvoEmoji = '<:nitroruby:1468521545361002622>';
                    else if (months >= 36) nitroEvoEmoji = '<:nitroemerald:1468521538193064119>';
                    else if (months >= 24) nitroEvoEmoji = '<:nitrodiamond:1468521536699895839>';
                    else if (months >= 12) nitroEvoEmoji = '<:nitroplatinum:1468521543846989947>';
                    else if (months >= 6)  nitroEvoEmoji = '<:nitrogold:1468521540113928194>';
                    else if (months >= 3)  nitroEvoEmoji = '<:nitrosilver:1468521546782867649>';
                    else if (months >= 1)  nitroEvoEmoji = '<:nitrobronze:1468521534921506841>';

                    // Add to Badges List
                    badgeList.push(nitroEvoEmoji); 
                    badgeList.push(boostEmoji); 

                    nitroTypeLine = `\n<:nitro:1468521533659156480> **Nitro Type:** Server Booster`;
                    subscriberSinceLine = `\n<:time:1468625930074460394> **Subscriber Since:** ${timestampDisplay}`;
                    boostingLine = `\n<:server_boost:1468633171758284872> **Boosting Since:** ${timestampDisplay}`;

                } else if (targetUser.banner || userDeco || targetUser.discriminator === '0') {
                    badgeList.push('<:nitro:1468521533659156480>');
                    nitroTypeLine = `\n<:nitro:1468521533659156480> **Nitro Type:** Nitro / Basic`;
                }
            }

            const badgesLine = badgeList.length > 0 
                ? `\n<:star_circle:1468623218574098502> **Badges:** ${badgeList.join(' ')}` 
                : ""; 

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
                .setAccentColor(8947848)
                .addSectionComponents(
                    new SectionBuilder()
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(userAvatar))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("## <:user:1468487542017097873> User Information"),
                            new TextDisplayBuilder().setContent(
                                `<:id:1468487725912166596> **ID:** \`${targetUser.id}\`\n` +
                                `<:at:1468487835613925396> ${targetUser.toString()} (\`${targetUser.username}\`)\n` +
                                `<:identity:1468485794938224807> **Display Name:** ${targetUser.globalName || targetUser.username}\n` +
                                `<:calender:1468485942137323630> **Account Created:** ${createdTimestamp}` +
                                badgesLine + 
                                nitroTypeLine + 
                                subscriberSinceLine + 
                                boostingLine + 
                                serverTagLine
                            ),
                        ),
                );

            if (userDeco) {
                container.addSectionComponents(
                    new SectionBuilder()
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(userDeco))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**<:star:1468618619318571029> Avatar Decoration:**`)),
                );
            }

            if (userBanner) {
                container
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent("<:discord:1468638005169229940> **Profile Banner:**"))
                    .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(userBanner)));
            }

            container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true));

            if (targetMember) {
                const serverSection = new SectionBuilder();
                if (memberAvatar) serverSection.setThumbnailAccessory(new ThumbnailBuilder().setURL(memberAvatar));

                serverSection.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("## <:home:1468487632328589458> Server Membership"),
                    new TextDisplayBuilder().setContent(
                        `<:name:1468486108450127915> **Nickname:** ${nickname}\n` +
                        `<:roles:1468486024089964654> **Roles:** ${rolesDisplay}\n` +
                        `<:calender:1468485942137323630> **Joined:** ${joinedTimestamp}\n` +
                        `<:location:1468629967956086961> **Join Position:** ${joinPosition}`
                    ),
                );
                container.addSectionComponents(serverSection);

                if (memberDeco && memberDeco !== userDeco) {
                    container.addSectionComponents(
                        new SectionBuilder()
                            .setThumbnailAccessory(new ThumbnailBuilder().setURL(memberDeco))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**<:star:1468618619318571029> Per-server Avatar Decoration:**`)),
                    );
                }

                const guildBanner = targetMember.bannerURL ? targetMember.bannerURL({ size: 1024 }) : null;
                if (guildBanner) {
                    container
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent("<:discord:1468638005169229940> **Per-server Profile Banner:**"))
                        .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(guildBanner)));
                }
            } else {
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent("-# User is not in this server."));
            }

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
