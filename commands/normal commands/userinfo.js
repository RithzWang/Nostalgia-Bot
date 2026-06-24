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

const { fetchAdvancedProfile } = require('../utils/v9Scraper'); 

module.exports = {
    name: 'userinfo',
    aliases: ['ui', 'user', 'u'],
    description: 'Displays information about a user with Server Tag and Avatar Decorations',

    async execute(message, args) {
        // 1. Show Typing indicator
        await message.channel.sendTyping();

        let tempEmoji = null; 

        try {
            // 2. Resolve User & Member
            let targetUser;
            if (message.mentions.users.first()) {
                targetUser = message.mentions.users.first();
            } else if (args[0]) {
                try { targetUser = await message.client.users.fetch(args[0], { force: true }); } catch (e) { targetUser = null; }
            } else {
                targetUser = message.author;
            }

            if (!targetUser) return message.reply("❌ User not found.");
            targetUser = await message.client.users.fetch(targetUser.id, { force: true });

            let targetMember = null;
            try { targetMember = await message.guild.members.fetch(targetUser.id); } catch (err) { targetMember = null; }

            // 3. Fetch V9 Advanced Data
            const v9Data = await fetchAdvancedProfile(targetUser.id).catch(() => null);

            let badgesText = null, connectionsText = null, nitroText = null, globalBoostText = null, colorString = null;

            if (v9Data) {
                if (v9Data.badges?.length > 0) badgesText = v9Data.badges.map(b => b.description).join(', ');
                if (v9Data.connected_accounts?.length > 0) connectionsText = v9Data.connected_accounts.map(acc => acc.type.charAt(0).toUpperCase() + acc.type.slice(1)).join(', ');
                if (v9Data.user?.premium_type === 1) nitroText = "Nitro Classic";
                else if (v9Data.user?.premium_type === 2) nitroText = "Nitro";
                else if (v9Data.user?.premium_type === 3) nitroText = "Nitro Basic";
                if (v9Data.premium_guild_since) globalBoostText = `<t:${Math.floor(new Date(v9Data.premium_guild_since).getTime() / 1000)}:R>`;
                
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

            // 5. Build UI
            const container = new ContainerBuilder();
            let userInfoText = `<:at:1468487835613925396> <@${targetUser.id}> (\`${targetUser.username}\`)\n` +
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

            container.addSectionComponents(new SectionBuilder().setThumbnailAccessory(new ThumbnailBuilder().setURL(targetUser.displayAvatarURL({ size: 1024 }))).addTextDisplayComponents(new TextDisplayBuilder().setContent("## <:user:1468487542017097873> User Information"), new TextDisplayBuilder().setContent(userInfoText)));
            if (targetUser.avatarDecorationURL()) container.addSectionComponents(new SectionBuilder().setThumbnailAccessory(new ThumbnailBuilder().setURL(targetUser.avatarDecorationURL())).addTextDisplayComponents(new TextDisplayBuilder().setContent(`**<:star:1468618619318571029> Avatar Decoration:**`)));
            if (targetUser.bannerURL()) container.addTextDisplayComponents(new TextDisplayBuilder().setContent("<:discord:1468638005169229940> **Profile Banner:**")).addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(targetUser.bannerURL())));

            if (targetMember) {
                container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true));
                container.addSectionComponents(new SectionBuilder().setThumbnailAccessory(new ThumbnailBuilder().setURL(targetMember.displayAvatarURL())).addTextDisplayComponents(new TextDisplayBuilder().setContent("## <:home:1468487632328589458> Server Membership"), new TextDisplayBuilder().setContent(`<:name:1468486108450127915> **Nickname:** ${targetMember.nickname || "None"}\n<:roles:1468486024089964654> **Roles:** ${targetMember.roles.cache.size - 1} (Highest: **@${targetMember.roles.highest.name}**)\n<:calendar:1470475413175144530> **Joined:** <t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>\n<:location:1468629967956086961> **Join Position:** ${Array.from(message.guild.members.cache.sort((a,b)=>a.joinedTimestamp-b.joinedTimestamp).values()).indexOf(targetMember)+1}/${message.guild.memberCount}`)));
                
                // Presence
                const p = message.guild.presences.cache.get(targetUser.id);
                let deviceText = [];
                if (p?.clientStatus?.desktop) deviceText.push('<:desktop:1519456094915792916> **Device:** Desktop');
                if (p?.clientStatus?.mobile) deviceText.push('<:mobile:1519456126276472832> **Device:** Mobile');
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## <:status:1519456062720446565> Presence Information\n${deviceText.join(' / ') || "Offline"}`));
            } else {
                container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)).addTextDisplayComponents(new TextDisplayBuilder().setContent("-# The user is not in this server."));
            }

            container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)).addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# <t:${Math.floor(Date.now()/1000)}:f>`);

            await message.reply({ components: [container], flags: [MessageFlags.IsComponentsV2, MessageFlags.SuppressNotifications], allowedMentions: { parse: [], repliedUser: false } });
            if (tempEmoji) setTimeout(() => tempEmoji.delete().catch(() => {}), 5000);
        } catch (error) {
            console.error("Userinfo Error:", error);
            if (tempEmoji) tempEmoji.delete().catch(() => {});
        }
    }
};
