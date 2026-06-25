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

const { fetchAdvancedProfile } = require('../../utils/v9Scraper'); 

// ====================================================
// 🏅 DYNAMIC BADGE EMOJI MAPPER
// ====================================================
function getBadgeEmoji(description, v9Data) {
    const desc = description.toLowerCase();

    // Hypesquad
    if (desc.includes('bravery')) return '<:hypesquad_bravery:1519665886007660546>';
    if (desc.includes('brilliance')) return '<:hypesquad_brilliance:1519665948406055023>';
    if (desc.includes('balance')) return '<:hypesquad_balance:1519665912012341329>';
    if (desc.includes('events')) return '<:hypesquad_events:1519665848418172968>';

    // Bug Hunter
    if (desc.includes('tier 2') || desc.includes('golden') || desc.includes('gold bug')) return '<:golden_bug_hunter:1519677604960141424>';
    if (desc.includes('bug hunter')) return '<:bug_hunter:1519677633380614327>';

    // Developer / Staff / Partner / Legacy
    if (desc.includes('early verified bot developer')) return '<:early_verified_bot_dev:1519677724354936832>';
    if (desc.includes('discord staff')) return '<:discord_staff:1519677661952348240>';
    if (desc.includes('partnered server owner')) return '<:partnered_server_owner:1519677814381609011>';
    if (desc.includes('moderator program')) return '<:mod_program_alumni:1519677756013547620>';
    if (desc.includes('early supporter')) return '<:early_supporter:1519677695242272929>';
    if (desc.includes('originally known as') || desc.includes('legacy username')) return '<:originally_known_as:1519677872116076576>';
    if (desc.includes('completed a quest')) return '<:completed_a_quest:1519677842709811240>';
    if (desc.includes('level') && desc.includes('reached')) return '<:april_fools_2026:1519721189755588679>';
    if (desc.includes('collected the orb profile badge')) return '<:obs:1519677786728693863>';

    // Gifting
    if (desc.includes('patron') || desc.includes('1 gift')) return '<:GiftingBadge_1x:1513283763931582684>';
    if (desc.includes('champion') || desc.includes('2 gift')) return '<:GiftingBadge_2x:1513283765844185301>';
    if (desc.includes('luminary') || desc.includes('3 gift')) return '<:GiftingBadge_3x:1513283767878287400>';
    if (desc.includes('icon') || desc.includes('6 gift')) return '<:GiftingBadge_6x:1513283769736626196>';
    if (desc.includes('hero') || desc.includes('10 gift')) return '<:GiftingBadge_10x:1513283771401502770>';
    if (desc.includes('legend') || desc.includes('20 gift')) return '<:GiftingBadge_20x:1513283772991148173>';

    // Bot Application Badges
    if (desc.includes('supports commands')) return '<:supports_commands:1519665984363823125>';
    if (desc.includes('uses automod')) return '<:uses_automod:1519666021185753290>';
    if (desc.includes('premium app')) return '<:premium_app:1519666071869722796>';

    // 🌟 Nitro Badges 
    if (desc.includes('subscriber since') || desc.includes('opal') || desc.includes('ruby') || desc.includes('emerald') || desc.includes('diamond') || desc.includes('platinum') || desc.includes('gold') || desc.includes('silver') || desc.includes('bronze')) {
        let months = 0;
        if (v9Data && v9Data.premium_since) {
            months = Math.floor((Date.now() - new Date(v9Data.premium_since).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        }
        
        if (desc.includes('opal') || months >= 72) return '<:nitro_opal:1519655008264650853>';
        if (desc.includes('ruby') || months >= 60) return '<:nitro_ruby:1519654970754859128>';
        if (desc.includes('emerald') || months >= 36) return '<:nitro_emerald:1519654908289224945>';
        if (desc.includes('diamond') || months >= 24) return '<:nitro_diamond:1519654880527126650>';
        if (desc.includes('platinum') || months >= 12) return '<:nitro_platinum:1519654853046046830>';
        if (desc.includes('gold') || months >= 6) return '<:nitro_gold:1519654755662561410>';
        if (desc.includes('silver') || months >= 3) return '<:nitro_silver:1519654713170067516>';
        if (desc.includes('bronze') || months >= 1) return '<:nitro_bronze:1519654069466173563>';
        return '<:nitro:1519654030899417128>';
    }

    // 🌟 Boosting Badges
    if (desc.includes('server boosting') || desc.includes('boosting since') || desc.includes('booster since') || desc.includes('month') || desc.includes('year')) {
        let months = 0;
        if (v9Data && v9Data.premium_guild_since) {
            months = Math.floor((Date.now() - new Date(v9Data.premium_guild_since).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        }
        
        if (desc.includes('24 month') || desc.includes('2 year') || months >= 24) return '<:boost_24:1519662668171182150>';
        if (desc.includes('18 month') || months >= 18) return '<:boost_18:1519662637082869810>';
        if (desc.includes('15 month') || months >= 15) return '<:boost_15m:1519662600265269298>';
        if (desc.includes('12 month') || desc.includes('1 year') || months >= 12) return '<:boost_12m:1519662567331598446>';
        if (desc.includes('9 month') || months >= 9) return '<:boost_9m:1519662532728459264>';
        if (desc.includes('6 month') || months >= 6) return '<:boost_6m:1519662504068776127>';
        if (desc.includes('3 month') || months >= 3) return '<:boost_3m:1519662459668004905>';
        if (desc.includes('2 month') || months >= 2) return '<:boost_2m:1519658261760970832>';
        return '<:boost_1m:1519657990943146096>';
    }

    return `\`${description}\``; 
}

module.exports = {
    name: 'userinfo',
    aliases: ['ui', 'user', 'u'],
    description: 'Displays information about a user',

    async execute(message, args) {
        await message.channel.sendTyping();

        let tempEmoji = null; 

        try {
            const targetId = message.mentions.users.first()?.id || args[0] || message.author.id;
            
            let targetUser;
            try { targetUser = await message.client.users.fetch(targetId, { force: true }); } 
            catch (err) { return message.reply("❌ User not found."); }

            let targetMember = null;
            try { targetMember = await message.guild.members.fetch(targetUser.id); } catch (err) { targetMember = null; }

            const v9Data = await fetchAdvancedProfile(targetUser.id).catch(() => null);

            let badgesText = null, connectionsText = null, nitroText = null, globalBoostText = null, colorString = null;

            if (v9Data) {
                if (v9Data.badges?.length > 0) {
                    badgesText = v9Data.badges.map(b => getBadgeEmoji(b.description, v9Data)).join(' ');
                }

                if (v9Data.connected_accounts?.length > 0) {
                    connectionsText = v9Data.connected_accounts.map(acc => acc.type.charAt(0).toUpperCase() + acc.type.slice(1)).join(', ');
                }

                const premiumType = v9Data.premium_type ?? v9Data.user?.premium_type;
                if (premiumType === 1) nitroText = "Nitro Classic";
                else if (premiumType === 2) nitroText = "Nitro";
                else if (premiumType === 3) nitroText = "Nitro Basic";
                
                if (v9Data.premium_guild_since) {
                    globalBoostText = `<t:${Math.floor(new Date(v9Data.premium_guild_since).getTime() / 1000)}:R>`;
                }
                
                if (v9Data.user_profile?.theme_colors?.length === 2) {
                    colorString = `<:colours:1519455969078411285> **Profile Theme:**\nPrimary: \`#${v9Data.user_profile.theme_colors[0].toString(16).padStart(6, '0').toUpperCase()}\`, Accent: \`#${v9Data.user_profile.theme_colors[1].toString(16).padStart(6, '0').toUpperCase()}\``;
                } else if (v9Data.user?.accent_color) {
                    colorString = `<:colours:1519455969078411285> **Banner Colour:** \`#${v9Data.user.accent_color.toString(16).padStart(6, '0').toUpperCase()}\``;
                }
            }

            let serverTagLine = null;
            if (targetUser.primaryGuild?.tag) {
                let badgeURL = targetUser.guildTagBadgeURL?.({ extension: 'png', size: 128 }) || 
                               (targetUser.primaryGuild.badge ? `https://cdn.discordapp.com/guild-tag-badges/${targetUser.primaryGuild.identityGuildId}/${targetUser.primaryGuild.badge}.png?size=128` : null);
                
                if (badgeURL) {
                    const storageGuild = message.client.guilds.cache.get('1490435762372481275');
                    try {
                        tempEmoji = await storageGuild.emojis.create({ attachment: badgeURL, name: `TagBadge` });
                        serverTagLine = `${tempEmoji} ${targetUser.primaryGuild.tag}`;
                    } catch (e) { serverTagLine = targetUser.primaryGuild.tag; }
                } else {
                    serverTagLine = targetUser.primaryGuild.tag;
                }
            }

            // ====================================================
            // BUILD UI: GLOBAL USER SECTION
            // ====================================================
            const container = new ContainerBuilder();
            
            let userInfoText = `<:at:1468487835613925396> <@${targetUser.id}> (\`${targetUser.username}\`)\n` +
                               `<:id:1468487725912166596> **ID:** \`${targetUser.id}\`\n` +
                               `<:identity:1468485794938224807> **Display Name:** ${targetUser.globalName || targetUser.username}\n` +
                               `<:calendar:1470475413175144530> **Account Created:** <t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`;

            if (badgesText) userInfoText += `\n<:star_circle:1468623218574098502> **Badges:** ${badgesText}`;
            if (nitroText) userInfoText += `\n<:nitro:1468618658388512809> **Nitro Type:** ${nitroText}`;
            if (globalBoostText) userInfoText += `\n<:server_boost:1468633171758284872> **Boosting Since:** ${globalBoostText}`;
            if (serverTagLine) userInfoText += `\n<:badge:1468618581427097724> **Server Tag:** ${serverTagLine}`;
            if (connectionsText) userInfoText += `\n<:connection:1468633345876431021> **Connections:** ${connectionsText}`;
            if (colorString) userInfoText += `\n${colorString}`;

            container.addSectionComponents(
                new SectionBuilder()
                    .setThumbnailAccessory(new ThumbnailBuilder().setURL(targetUser.displayAvatarURL({ size: 4096 })))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("## <:user:1468487542017097873> User Information"), 
                        new TextDisplayBuilder().setContent(userInfoText)
                    )
            );

            if (targetUser.avatarDecorationURL()) {
                container.addSectionComponents(
                    new SectionBuilder()
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(targetUser.avatarDecorationURL({ size: 4096 })))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**<:star:1468618619318571029> Avatar Decoration:**`))
                );
            }

            // 🌟 NEW: GLOBAL NAMEPLATE LOGIC
            let globalNameplateUrl = null;
            if (typeof targetUser.nameplateURL === 'function') {
                // If discord.js updates to support it natively
                globalNameplateUrl = targetUser.nameplateURL({ size: 4096 });
            } else if (v9Data?.user?.collectibles?.nameplate?.asset) {
                // Fallback resolver pulling directly from the profile endpoint
                const npAsset = v9Data.user.collectibles.nameplate.asset;
                globalNameplateUrl = `https://cdn.discordapp.com/nameplate-presets/${npAsset}.png`;
            }

            if (globalNameplateUrl) {
                try {
                    new URL(globalNameplateUrl); // Ensure it's a valid URL so it doesn't crash the container
                    container.addSectionComponents(
                        new SectionBuilder()
                            .setThumbnailAccessory(new ThumbnailBuilder().setURL(globalNameplateUrl))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**<:star:1468618619318571029> Nameplate:**`))
                    );
                } catch (e) {}
            }

            if (targetUser.bannerURL()) {
                container
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent("<:discord:1468638005169229940> **Profile Banner:**"))
                    .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(targetUser.bannerURL({ size: 4096 }))));
            }

            // ====================================================
            // BUILD UI: SERVER MEMBERSHIP SECTION
            // ====================================================
            if (targetMember) {
                container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true));

                const serverIconUrl = targetMember.avatar ? targetMember.displayAvatarURL({ size: 4096 }) : message.guild.iconURL({ size: 4096 });
                const highestRoleText = targetMember.roles.highest.id === message.guild.id ? "@everyone" : `<@&${targetMember.roles.highest.id}>`;
                
                const sortedMembers = Array.from(message.guild.members.cache.sort((a,b)=>a.joinedTimestamp-b.joinedTimestamp).values());
                const joinPosition = sortedMembers.indexOf(targetMember) + 1;

                const membershipContent = new TextDisplayBuilder().setContent(
                    `<:name:1468486108450127915> **Nickname:** ${targetMember.nickname || "None"}\n` +
                    `<:roles:1468486024089964654> **Roles:** ${targetMember.roles.cache.size - 1} (Highest: ${highestRoleText})\n` +
                    `<:calendar:1470475413175144530> **Joined:** <t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>\n` +
                    `<:location:1468629967956086961> **Join Position:** ${joinPosition}`
                );

                if (serverIconUrl) {
                    container.addSectionComponents(
                        new SectionBuilder()
                            .setThumbnailAccessory(new ThumbnailBuilder().setURL(serverIconUrl))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent("## <:home:1468487632328589458> Server Membership"), membershipContent)
                    );
                } else {
                    container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("## <:home:1468487632328589458> Server Membership"), 
                        membershipContent
                    );
                }
                
                if (targetMember.avatarDecorationURL() && targetMember.avatarDecorationURL() !== targetUser.avatarDecorationURL()) {
                    container.addSectionComponents(
                        new SectionBuilder()
                            .setThumbnailAccessory(new ThumbnailBuilder().setURL(targetMember.avatarDecorationURL({ size: 4096 })))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**<:star:1468618619318571029> Per-server Avatar Decoration:**`))
                    );
                }

                // 🌟 NEW: PER-SERVER NAMEPLATE LOGIC
                let serverNameplateUrl = null;
                if (typeof targetMember.nameplateURL === 'function') {
                    serverNameplateUrl = targetMember.nameplateURL({ size: 4096 });
                } else if (v9Data?.guild_member?.collectibles?.nameplate?.asset) {
                    const npAsset = v9Data.guild_member.collectibles.nameplate.asset;
                    serverNameplateUrl = `https://cdn.discordapp.com/nameplate-presets/${npAsset}.png`;
                }

                if (serverNameplateUrl && serverNameplateUrl !== globalNameplateUrl) {
                    try {
                        new URL(serverNameplateUrl); // Ensure validity
                        container.addSectionComponents(
                            new SectionBuilder()
                                .setThumbnailAccessory(new ThumbnailBuilder().setURL(serverNameplateUrl))
                                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**<:star:1468618619318571029> Per-server Nameplate:**`))
                        );
                    } catch (e) {}
                }

                const guildBanner = targetMember.bannerURL ? targetMember.bannerURL({ size: 4096 }) : null;
                if (guildBanner) {
                    container
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent("<:discord:1468638005169229940> **Per-server Profile Banner:**"))
                        .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(guildBanner)));
                }

                // ====================================================
                // BUILD UI: PRESENCE SECTION 
                // ====================================================
                const p = message.guild.presences.cache.get(targetUser.id);
                
                if (p && p.status !== 'offline') {
                    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true));
                    
                    let deviceIcons = [];
                    
                    if (p.clientStatus?.desktop) {
                        if (p.clientStatus.desktop === 'online') deviceIcons.push('<:desktop_online:1519790524024750150>');
                        else if (p.clientStatus.desktop === 'idle') deviceIcons.push('<:desktop_idle:1519790620930084954>');
                        else if (p.clientStatus.desktop === 'dnd') deviceIcons.push('<:desktop_dnd:1519790648750768219>');
                    }
                    if (p.clientStatus?.mobile) {
                        if (p.clientStatus.mobile === 'online') deviceIcons.push('<:mobile_online:1519790679096688843>');
                        else if (p.clientStatus.mobile === 'idle') deviceIcons.push('<:mobile_idle:1519790711258615879>');
                        else if (p.clientStatus.mobile === 'dnd') deviceIcons.push('<:mobile_dnd:1519790739582881934>');
                    }
                    if (p.clientStatus?.web) {
                        if (p.clientStatus.web === 'online') deviceIcons.push('<:web_online:1519795478089437366>');
                        else if (p.clientStatus.web === 'idle') deviceIcons.push('<:web_idle:1519795507248103665>');
                        else if (p.clientStatus.web === 'dnd') deviceIcons.push('<:web_dnd:1519795538512449638>');
                    }
                    
                    const devicesStr = deviceIcons.length > 0 ? deviceIcons.join(' ') : 'Unknown';
                    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## <:status:1519456062720446565> Presence Information\n<:desktop:1519456094915792916> **Devices:** ${devicesStr}`));

                    const activities = p.activities.filter(act => act.type !== 4);
                    if (activities.length > 0) {
                        const actSection = new SectionBuilder();
                        
                        let actImage = null;
                        for (const activity of activities) {
                            try {
                                if (activity.name === 'Spotify' && activity.assets?.largeImage) {
                                    actImage = `https://i.scdn.co/image/${activity.assets.largeImage.replace('spotify:', '')}`;
                                } else if (activity.assets?.largeImage) {
                                    if (activity.assets.largeImage.startsWith('mp:')) {
                                        actImage = `https://media.discordapp.net/${activity.assets.largeImage.replace('mp:', '')}`;
                                    } else if (activity.applicationId) {
                                        const assetId = activity.assets.largeImage.split(':')[1] || activity.assets.largeImage;
                                        actImage = `https://cdn.discordapp.com/app-assets/${activity.applicationId}/${assetId}.png`;
                                    }
                                }
                            } catch (e) {}

                            if (actImage && actImage.startsWith('http')) {
                                try {
                                    new URL(actImage); 
                                    actSection.setThumbnailAccessory(new ThumbnailBuilder().setURL(actImage));
                                    break; 
                                } catch (e) {
                                    actImage = null;
                                } 
                            }
                        }

                        let actContent = `<:activity:1519456032772980776> **${activities.length > 1 ? 'Activities' : 'Activity'}:**`;

                        for (const activity of activities) {
                            let actTypeString = "Playing";
                            if (activity.type === 2) actTypeString = "Listening to";
                            else if (activity.type === 3) actTypeString = "Watching";
                            else if (activity.type === 5) actTypeString = "Competing in";

                            actContent += `\n${actTypeString} **${activity.name || "Unknown"}**`;
                            
                            if (activity.name === 'Spotify') {
                                if (activity.details) actContent += `\n-# **Song:** ${activity.details}`;
                                if (activity.state) actContent += `\n-# **Artist:** ${activity.state}`;
                                if (activity.assets?.largeText) actContent += `\n-# **Album:** ${activity.assets.largeText}`;
                            }
                        }

                        actSection.addTextDisplayComponents(new TextDisplayBuilder().setContent(actContent));
                        container.addSectionComponents(actSection);
                    }

                    const customStatus = p.activities.find(act => act.type === 4);
                    if (customStatus) {
                        const statusSection = new SectionBuilder();
                        let statusEmojiUrl = null;
                        let defaultEmoji = "";

                        if (customStatus.emoji) {
                            if (customStatus.emoji.id) {
                                statusEmojiUrl = `https://cdn.discordapp.com/emojis/${customStatus.emoji.id}.${customStatus.emoji.animated ? 'gif' : 'png'}?size=1024`;
                            } else if (customStatus.emoji.name) {
                                defaultEmoji = `${customStatus.emoji.name} `;
                            }
                        }
                        
                        if (statusEmojiUrl) {
                            try {
                                new URL(statusEmojiUrl);
                                statusSection.setThumbnailAccessory(new ThumbnailBuilder().setURL(statusEmojiUrl));
                            } catch (e) {}
                        }

                        let stateText = customStatus.state || "";
                        let finalContent = `<:customstatus:1519456000963252294> **Custom Status:**`;
                        
                        if (defaultEmoji || stateText) {
                            finalContent += `\n-# **State:** ${defaultEmoji}${stateText}`;
                        }

                        const statusDisplay = new TextDisplayBuilder().setContent(finalContent.trim());

                        if (statusEmojiUrl) {
                            container.addSectionComponents(
                                new SectionBuilder()
                                    .setThumbnailAccessory(new ThumbnailBuilder().setURL(statusEmojiUrl))
                                    .addTextDisplayComponents(statusDisplay)
                            );
                        } else {
                            container.addTextDisplayComponents(statusDisplay);
                        }
                    }
                }
            } else {
                container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
                         .addTextDisplayComponents(new TextDisplayBuilder().setContent("-# The user is not in this server."));
            }

            // ====================================================
            // BUILD UI: FOOTER
            // ====================================================
            container
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# <t:${Math.floor(Date.now() / 1000)}:f>`));

            await message.reply({ 
                components: [container], 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.SuppressNotifications], 
                allowedMentions: { parse: [], repliedUser: false } 
            });
            
            if (tempEmoji) setTimeout(() => tempEmoji.delete().catch(() => {}), 5000);

        } catch (error) {
            console.error("Userinfo Error:", error?.rawError || error);
            
            let deepError = error?.message || "Unknown UI Build Error";
            if (error?.rawError) {
                deepError = JSON.stringify(error.rawError, null, 2);
            }
            if (deepError.length > 1800) deepError = deepError.slice(0, 1800) + '\n...';
            
            await message.reply(`❌ **API Error:**\n\`\`\`json\n${deepError}\n\`\`\``).catch(() => {});
            if (tempEmoji) tempEmoji.delete().catch(() => {});
        }
    }
};
