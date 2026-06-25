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
    if (desc.includes('bravery')) return '<:hypesquadbravery:1468521511353843748>';
    if (desc.includes('brilliance')) return '<:hypesquadbrilliance:1468521513656258634>';
    if (desc.includes('balance')) return '<:hypesquadbalance:1468521509462081597>';
    if (desc.includes('events')) return '<:hypesquadevents:1468521524725157939>';

    // Bug Hunter
    if (desc.includes('tier 2') || desc.includes('golden') || desc.includes('gold bug')) return '<:bughuntergold:1468521499160739841>';
    if (desc.includes('bug hunter')) return '<:bughuntergreen:1468521502377906328>';

    // Developer / Staff / Partner / Legacy
    if (desc.includes('early verified bot developer')) return '<:earlyverifiedbotdeveloper:1468521505762574485>';
    if (desc.includes('discord staff')) return '<:discord_staff:1468521557075689556>';
    if (desc.includes('partnered server owner')) return '<:partner4:1468521552638382292>';
    if (desc.includes('moderator program')) return '<:modold:1468521531603943476>';
    if (desc.includes('early supporter')) return '<:earlysupporter:1468521504307150848>';
    if (desc.includes('originally known as') || desc.includes('legacy username')) return '<:username:1468521559202201623>';
    if (desc.includes('completed a quest')) return '<:quest:1468521554605379617>';
    if (desc.includes('level') && desc.includes('reached')) return '<:april_fools_2026:1519423360218697892>';
    if (desc.includes('orb')) return '<:orbs:1468521551065256063>';

    // Gifting
    if (desc.includes('patron') || desc.includes('1 gift')) return '<:GiftingBadge_1x:1513283763931582684>';
    if (desc.includes('champion') || desc.includes('2 gift')) return '<:GiftingBadge_2x:1513283765844185301>';
    if (desc.includes('luminary') || desc.includes('3 gift')) return '<:GiftingBadge_3x:1513283767878287400>';
    if (desc.includes('icon') || desc.includes('6 gift')) return '<:GiftingBadge_6x:1513283769736626196>';
    if (desc.includes('hero') || desc.includes('10 gift')) return '<:GiftingBadge_10x:1513283771401502770>';
    if (desc.includes('legend') || desc.includes('20 gift')) return '<:GiftingBadge_20x:1513283772991148173>';

    // Bot Application Badges
    if (desc.includes('supports commands')) return '<:slash:1468653349627891752>';
    if (desc.includes('uses automod')) return '<:uses_automod:1468521528424402976>';
    if (desc.includes('premium app')) return '<:premium_app:1468653351863582842>';

    // 🌟 Nitro Badges (Aggressively catches "Subscriber since")
    if (desc.includes('subscriber since') || desc.includes('opal') || desc.includes('ruby') || desc.includes('emerald') || desc.includes('diamond') || desc.includes('platinum') || desc.includes('gold') || desc.includes('silver') || desc.includes('bronze')) {
        let months = 0;
        if (v9Data && v9Data.premium_since) {
            months = Math.floor((Date.now() - new Date(v9Data.premium_since).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        }
        
        if (desc.includes('opal') || months >= 72) return '<:nitroopal:1468521541368152179>';
        if (desc.includes('ruby') || months >= 60) return '<:nitroruby:1468521545361002622>';
        if (desc.includes('emerald') || months >= 36) return '<:nitroemerald:1468521538193064119>';
        if (desc.includes('diamond') || months >= 24) return '<:nitrodiamond:1468521536699895839>';
        if (desc.includes('platinum') || months >= 12) return '<:nitroplatinum:1468521543846989947>';
        if (desc.includes('gold') || months >= 6) return '<:nitrogold:1468521540113928194>';
        if (desc.includes('silver') || months >= 3) return '<:nitrosilver:1468521546782867649>';
        return '<:nitrobronze:1468521534921506841>';
    }

    // 🌟 Boosting Badges (Aggressively catches "Server Boosting since")
    if (desc.includes('server boosting') || desc.includes('boosting since') || desc.includes('booster since') || desc.includes('month') || desc.includes('year')) {
        let months = 0;
        if (v9Data && v9Data.premium_guild_since) {
            months = Math.floor((Date.now() - new Date(v9Data.premium_guild_since).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        }
        
        if (desc.includes('24 month') || desc.includes('2 year') || months >= 24) return '<:bost24m:1468521497101340769>';
        if (desc.includes('18 month') || months >= 18) return '<:boost18m:1468521485659537577>';
        if (desc.includes('15 month') || months >= 15) return '<:boost15m:1468521482949890088>';
        if (desc.includes('12 month') || desc.includes('1 year') || months >= 12) return '<:boost12m:1468521480852733965>';
        if (desc.includes('9 month') || months >= 9) return '<:boost9m:1468521495058972672>';
        if (desc.includes('6 month') || months >= 6) return '<:boost6m:1468521492500316370>';
        if (desc.includes('3 month') || months >= 3) return '<:boost3m:1468521490541707346>';
        if (desc.includes('2 month') || months >= 2) return '<:boost2m:1468521488704602268>';
        return '<:boost1m:1468521487202783346>';
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

                if (v9Data.user?.premium_type === 1) nitroText = "Nitro Classic";
                else if (v9Data.user?.premium_type === 2) nitroText = "Nitro";
                else if (v9Data.user?.premium_type === 3) nitroText = "Nitro Basic";
                
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
                        tempEmoji = await storageGuild.emojis.create({ attachment: badgeURL, name: `T${targetUser.id.slice(-5)}` });
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

            if (badgesText) {
                userInfoText += `\n<:star_circle:1468623218574098502> **Badge:** ${badgesText}`;
                if (globalBoostText) userInfoText += `\n<:server_boost:1468633171758284872> **Boosting Since:** ${globalBoostText}`;
            }
            if (serverTagLine) userInfoText += `\n<:badge:1468618581427097724> **Server Tag:** ${serverTagLine}`;
            if (connectionsText) userInfoText += `\n<:connection:1468633345876431021> **Connection:** ${connectionsText}`;
            if (nitroText) userInfoText += `\n<:nitro:1468618658388512809> **Nitro Type:** ${nitroText}`;
            if (!badgesText && globalBoostText) userInfoText += `\n<:server_boost:1468633171758284872> **Boosting Since:** ${globalBoostText}`;
            if (colorString) userInfoText += `\n${colorString}`;

            container.addSectionComponents(
                new SectionBuilder()
                    .setThumbnailAccessory(new ThumbnailBuilder().setURL(targetUser.displayAvatarURL({ size: 1024 })))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("## <:user:1468487542017097873> User Information"), 
                        new TextDisplayBuilder().setContent(userInfoText)
                    )
            );

            if (targetUser.avatarDecorationURL()) {
                container.addSectionComponents(
                    new SectionBuilder()
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(targetUser.avatarDecorationURL()))
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**<:star:1468618619318571029> Avatar Decoration:**`))
                );
            }

            if (targetUser.bannerURL()) {
                container
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent("<:discord:1468638005169229940> **Profile Banner:**"))
                    .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(targetUser.bannerURL())));
            }

            // ====================================================
            // BUILD UI: SERVER MEMBERSHIP SECTION
            // ====================================================
            if (targetMember) {
                container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true));

                const serverIconUrl = targetMember.avatar ? targetMember.displayAvatarURL({ size: 1024 }) : message.guild.iconURL({ size: 1024 });
                const highestRoleText = targetMember.roles.highest.id === message.guild.id ? "@everyone" : `<@&${targetMember.roles.highest.id}>`;
                
                const sortedMembers = Array.from(message.guild.members.cache.sort((a,b)=>a.joinedTimestamp-b.joinedTimestamp).values());
                const joinPosition = sortedMembers.indexOf(targetMember) + 1;

                const membershipSection = new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("## <:home:1468487632328589458> Server Membership"), 
                        new TextDisplayBuilder().setContent(
                            `<:name:1468486108450127915> **Nickname:** ${targetMember.nickname || "None"}\n` +
                            `<:roles:1468486024089964654> **Roles:** ${targetMember.roles.cache.size - 1} (Highest: ${highestRoleText})\n` +
                            `<:calendar:1470475413175144530> **Joined:** <t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>\n` +
                            `<:location:1468629967956086961> **Join Position:** ${joinPosition}`
                        )
                    );
                
                if (serverIconUrl) {
                    membershipSection.setThumbnailAccessory(new ThumbnailBuilder().setURL(serverIconUrl));
                }
                container.addSectionComponents(membershipSection);
                
                if (targetMember.avatarDecorationURL() && targetMember.avatarDecorationURL() !== targetUser.avatarDecorationURL()) {
                    container.addSectionComponents(
                        new SectionBuilder()
                            .setThumbnailAccessory(new ThumbnailBuilder().setURL(targetMember.avatarDecorationURL()))
                            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**<:star:1468618619318571029> Per-server Avatar Decoration:**`))
                    );
                }

                const guildBanner = targetMember.bannerURL ? targetMember.bannerURL({ size: 1024 }) : null;
                if (guildBanner) {
                    container
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent("<:discord:1468638005169229940> **Per-server Profile Banner:**"))
                        .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(guildBanner)));
                }

                // ====================================================
                // BUILD UI: PRESENCE SECTION (Online Conditional)
                // ====================================================
                const p = message.guild.presences.cache.get(targetUser.id);
                
                if (p && p.status !== 'offline') {
                    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true));
                    
                    let deviceText = [];
                    if (p.clientStatus?.desktop) deviceText.push('<:desktop:1519456094915792916> **Device:** Desktop');
                    if (p.clientStatus?.mobile) deviceText.push('<:mobile:1519456126276472832> **Device:** Mobile');
                    if (p.clientStatus?.web) deviceText.push('🌐 **Device:** Web');
                    
                    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## <:status:1519456062720446565> Presence Information\n${deviceText.join(' / ') || "Unknown"}`));

                    const activity = p.activities.find(act => act.type !== 4);
                    if (activity) {
                        const actSection = new SectionBuilder();
                        let actImage = null;
                        
                        if (activity.name === 'Spotify' && activity.assets?.largeImage) {
                            actImage = `https://i.scdn.co/image/${activity.assets.largeImage.replace('spotify:', '')}`;
                        } else if (activity.assets?.largeImage) {
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

                    // 🛠️ FIX: Custom Emoji goes to Thumbnail, Default goes to Text
                    const customStatus = p.activities.find(act => act.type === 4);
                    if (customStatus) {
                        const statusSection = new SectionBuilder();
                        let statusEmojiUrl = null;
                        let defaultEmojiText = "";

                        if (customStatus.emoji) {
                            if (customStatus.emoji.id) {
                                statusEmojiUrl = `https://cdn.discordapp.com/emojis/${customStatus.emoji.id}.${customStatus.emoji.animated ? 'gif' : 'png'}`;
                            } else if (customStatus.emoji.name) {
                                defaultEmojiText = `\n-# **Emoji:** ${customStatus.emoji.name}`;
                            }
                        }
                        
                        // Only add a Thumbnail if there is a custom image emoji URL to display
                        if (statusEmojiUrl) {
                            statusSection.setThumbnailAccessory(new ThumbnailBuilder().setURL(statusEmojiUrl));
                        }

                        let stateText = customStatus.state ? `\n-# **State:** ${customStatus.state}` : "";

                        statusSection.addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`<:customstatus:1519456000963252294> **Custom Status:**${defaultEmojiText}${stateText}`)
                        );
                        container.addSectionComponents(statusSection);
                    }
                }
            } else {
                // Not in server fallback
                container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
                         .addTextDisplayComponents(new TextDisplayBuilder().setContent("-# The user is not in this server."));
            }

            // ====================================================
            // BUILD UI: FOOTER
            // ====================================================
            container
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# <t:${Math.floor(Date.now() / 1000)}:f> • Developed by Ridouan AKA Rithz`));

            await message.reply({ 
                components: [container], 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.SuppressNotifications], 
                allowedMentions: { parse: [], repliedUser: false } 
            });
            
            if (tempEmoji) setTimeout(() => tempEmoji.delete().catch(() => {}), 5000);

        } catch (error) {
            console.error("Userinfo Error:", error?.rawError || error);
            
            // 🕵️ Extract deep error
            let deepError = error?.message || "Unknown UI Build Error";
            if (error?.rawError?.errors) {
                deepError = JSON.stringify(error.rawError.errors, null, 2);
                if (deepError.length > 1800) deepError = deepError.slice(0, 1800) + '\n...';
            }
            
            await message.reply(`❌ **API Error:**\n\`\`\`json\n${deepError}\n\`\`\``).catch(() => {});
            if (tempEmoji) tempEmoji.delete().catch(() => {});
        }
    }
};
