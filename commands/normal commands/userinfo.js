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

    // 🌟 Nitro Badges (Keyword catching for Discord's new text format)
    if (desc.includes('opal')) return '<:nitroopal:1468521541368152179>';
    if (desc.includes('ruby')) return '<:nitroruby:1468521545361002622>';
    if (desc.includes('emerald')) return '<:nitroemerald:1468521538193064119>';
    if (desc.includes('diamond')) return '<:nitrodiamond:1468521536699895839>';
    if (desc.includes('platinum')) return '<:nitroplatinum:1468521543846989947>';
    if (desc.includes('gold')) return '<:nitrogold:1468521540113928194>';
    if (desc.includes('silver')) return '<:nitrosilver:1468521546782867649>';
    if (desc.includes('bronze')) return '<:nitrobronze:1468521534921506841>';

    // 🌟 Boosting Badges (Keyword catching for exact months)
    if (desc.includes('24 month')) return '<:bost24m:1468521497101340769>';
    if (desc.includes('18 month')) return '<:boost18m:1468521485659537577>';
    if (desc.includes('15 month')) return '<:boost15m:1468521482949890088>';
    if (desc.includes('12 month') || desc.includes('1 year')) return '<:boost12m:1468521480852733965>';
    if (desc.includes('9 month')) return '<:boost9m:1468521495058972672>';
    if (desc.includes('6 month')) return '<:boost6m:1468521492500316370>';
    if (desc.includes('3 month')) return '<:boost3m:1468521490541707346>';
    if (desc.includes('2 month')) return '<:boost2m:1468521488704602268>';
    if (desc.includes('1 month')) return '<:boost1m:1468521487202783346>';

    // Fallback if Discord adds a brand new badge we don't recognize yet
    return `\`${description}\``; 
}


module.exports = {
    name: 'userinfo',
    aliases: ['ui', 'user', 'u'],
    description: 'Displays information about a user',

    async execute(message, args) {
        // 1. Show Typing indicator
        await message.channel.sendTyping();

        let tempEmoji = null; 

        try {
            // 2. Resolve User & Member (Fixed silent error resolution)
            const targetId = message.mentions.users.first()?.id || args[0] || message.author.id;
            
            let targetUser;
            try { 
                targetUser = await message.client.users.fetch(targetId, { force: true }); 
            } catch (err) { 
                return message.reply("❌ User not found."); 
            }

            let targetMember = null;
            try { targetMember = await message.guild.members.fetch(targetUser.id); } catch (err) { targetMember = null; }

            // 3. Fetch V9 Advanced Data
            const v9Data = await fetchAdvancedProfile(targetUser.id).catch(() => null);

            let badgesText = null, connectionsText = null, nitroText = null, globalBoostText = null, colorString = null;

            if (v9Data) {
                // Emoji Mapper in Action
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

            // 4. Server Tag Logic
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
            // 5. BUILD UI: GLOBAL USER SECTION
            // ====================================================
            const container = new ContainerBuilder();
            
            // Replaced actual mention with @username string to ensure no pinging whatsoever
            let userInfoText = `<:at:1468487835613925396> **@${targetUser.username}** (\`${targetUser.username}\`)\n` +
                               `<:id:1468487725912166596> **ID:** \`${targetUser.id}\`\n` +
                               `<:identity:1468485794938224807> **Display Name:** \`${targetUser.globalName || targetUser.username}\`\n` +
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
            // 6. BUILD UI: SERVER MEMBERSHIP SECTION
            // ====================================================
            if (targetMember) {
                container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true));

                const serverIconUrl = targetMember.avatar ? targetMember.displayAvatarURL({ size: 1024 }) : message.guild.iconURL({ size: 1024 });
                const highestRoleText = targetMember.roles.highest.id === message.guild.id ? "@everyone" : `**@${targetMember.roles.highest.name}**`;
                const sortedMembers = Array.from(message.guild.members.cache.sort((a,b)=>a.joinedTimestamp-b.joinedTimestamp).values());
                const joinPosition = sortedMembers.indexOf(targetMember) + 1;

                container.addSectionComponents(
                    new SectionBuilder()
                        .setThumbnailAccessory(serverIconUrl ? new ThumbnailBuilder().setURL(serverIconUrl) : null)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent("## <:home:1468487632328589458> Server Membership"), 
                            new TextDisplayBuilder().setContent(
                                `<:name:1468486108450127915> **Nickname:** ${targetMember.nickname || "None"}\n` +
                                `<:roles:1468486024089964654> **Roles:** ${targetMember.roles.cache.size - 1} (Highest: ${highestRoleText})\n` +
                                `<:calendar:1470475413175144530> **Joined:** <t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>\n` +
                                `<:location:1468629967956086961> **Join Position:** ${joinPosition}/${message.guild.memberCount}`
                            )
                        )
                );
                
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
                // 7. BUILD UI: PRESENCE SECTION
                // ====================================================
                container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true));
                const p = message.guild.presences.cache.get(targetUser.id);
                
                let deviceText = [];
                if (p?.clientStatus?.desktop) deviceText.push('<:desktop:1519456094915792916> **Device:** Desktop');
                if (p?.clientStatus?.mobile) deviceText.push('<:mobile:1519456126276472832> **Device:** Mobile');
                if (p?.clientStatus?.web) deviceText.push('🌐 **Device:** Web');
                
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## <:status:1519456062720446565> Presence Information\n${deviceText.join(' / ') || "Offline"}`));

                if (p) {
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

                    const customStatus = p.activities.find(act => act.type === 4);
                    if (customStatus) {
                        const statusSection = new SectionBuilder();
                        let statusEmojiUrl = null;
                        if (customStatus.emoji?.id) {
                            statusEmojiUrl = `https://cdn.discordapp.com/emojis/${customStatus.emoji.id}.${customStatus.emoji.animated ? 'gif' : 'png'}`;
                        }
                        if (statusEmojiUrl) statusSection.setThumbnailAccessory(new ThumbnailBuilder().setURL(statusEmojiUrl));

                        statusSection.addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(`<:customstatus:1519456000963252294> **Custom Status:**\n-# **State:** ${customStatus.state || ""}`)
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
            // 8. BUILD UI: FOOTER
            // ====================================================
            container
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# <t:${Math.floor(Date.now() / 1000)}:f>`));

            // Send Final Message
            await message.reply({ 
                components: [container], 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.SuppressNotifications], 
                allowedMentions: { parse: [], repliedUser: false } 
            });
            
            if (tempEmoji) setTimeout(() => tempEmoji.delete().catch(() => {}), 5000);
        } catch (error) {
            console.error("Userinfo Error:", error);
            if (tempEmoji) tempEmoji.delete().catch(() => {});
        }
    }
};
