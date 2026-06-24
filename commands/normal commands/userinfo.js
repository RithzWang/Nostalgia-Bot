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
        // ✅ Show "Typing..." immediately
        await message.channel.sendTyping();

        let tempEmoji = null; 

        try {
            // ====================================================
            // 1. RESOLVE USER & MEMBER
            // ====================================================
            let targetUser;
            
            if (message.mentions.users.first()) {
                targetUser = message.mentions.users.first();
            } else if (args[0]) {
                try { targetUser = await message.client.users.fetch(args[0], { force: true }); } catch (e) { targetUser = null; }
            } else {
                targetUser = message.author;
            }

            if (!targetUser) return message.reply("❌ User not found.");
            
            // Ensure we have full user object
            targetUser = await message.client.users.fetch(targetUser.id, { force: true });

            let targetMember = null;
            try { targetMember = await message.guild.members.fetch(targetUser.id); } catch (err) { targetMember = null; }

            // ====================================================
            // 2. FETCH V9 ADVANCED DATA
            // ====================================================
            const v9Data = await fetchAdvancedProfile(targetUser.id).catch(() => null);

            let badgesText = null;
            let connectionsText = null;
            let nitroText = null;
            let globalBoostText = null;
            let colorString = null;

            if (v9Data) {
                if (v9Data.badges && v9Data.badges.length > 0) {
                    badgesText = v9Data.badges.map(b => b.description).join(', ');
                }

                if (v9Data.connected_accounts && v9Data.connected_accounts.length > 0) {
                    connectionsText = v9Data.connected_accounts.map(acc => {
                        return acc.type.charAt(0).toUpperCase() + acc.type.slice(1);
                    }).join(', ');
                }

                if (v9Data.user?.premium_type === 1) nitroText = "Nitro Classic";
                else if (v9Data.user?.premium_type === 2) nitroText = "Nitro";
                else if (v9Data.user?.premium_type === 3) nitroText = "Nitro Basic";

                if (v9Data.premium_guild_since) {
                    globalBoostText = `<t:${Math.floor(new Date(v9Data.premium_guild_since).getTime() / 1000)}:R>`;
                }

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
                            tempEmoji = await storageGuild.emojis.create({ attachment: badgeURL, name: safeEmojiName });
                            tagDisplay = `${tempEmoji} ${guildInfo.tag}`;
                        } catch (emojiErr) { console.error("Temp Emoji Error:", emojiErr); }
                    }
                }
                serverTagLine = `${tagDisplay}`;
            }

            // ====================================================
            // 4. BUILD UI
            // ====================================================
            const userAvatar = targetUser.displayAvatarURL({ size: 1024, forceStatic: false });
            const userBanner = targetUser.bannerURL({ size: 1024, forceStatic: false });
            const userDeco = targetUser.avatarDecorationURL({ size: 1024 }); 
            const createdTimestamp = `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`;

            let userInfoText = `<:at:1468487835613925396> <@${targetUser.id}> (\`${targetUser.username}\`)\n` +
                               `<:id:1468487725912166596> **ID:** \`${targetUser.id}\`\n` +
                               `<:identity:1468485794938224807> **Display Name:** \`${targetUser.globalName || targetUser.username}\`\n` +
                               `<:calendar:1470475413175144530> **Account Created:** ${createdTimestamp}`;

            if (badgesText) userInfoText += `\n<:star_circle:1468623218574098502> **Badge:** ${badgesText}`;
            if (serverTagLine) userInfoText += `\n<:badge:1468618581427097724> **Server Tag:** ${serverTagLine}`;
            if (connectionsText) userInfoText += `\n<:connection:1468633345876431021> **Connection:** ${connectionsText}`;
            if (nitroText) userInfoText += `\n<:nitro:1468618658388512809> **Nitro Type:** ${nitroText}`;
            if (globalBoostText) userInfoText += `\n<:server_boost:1468633171758284872> **Boosting Since:** ${globalBoostText}`;
            if (colorString) userInfoText += `\n${colorString}`;

            const container = new ContainerBuilder();
            container.addSectionComponents(
                new SectionBuilder()
                    .setThumbnailAccessory(new ThumbnailBuilder().setURL(userAvatar))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent("## <:user:1468487542017097873> User Information"),
                        new TextDisplayBuilder().setContent(userInfoText)
                    )
            );

            if (userDeco) {
                container.addSectionComponents(new SectionBuilder().setThumbnailAccessory(new ThumbnailBuilder().setURL(userDeco)).addTextDisplayComponents(new TextDisplayBuilder().setContent(`**<:star:1468618619318571029> Avatar Decoration:**`)));
            }

            if (userBanner) {
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent("<:discord:1468638005169229940> **Profile Banner:**"))
                    .addMediaGalleryComponents(new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(userBanner)));
            }

            if (targetMember) {
                container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true));
                const serverSection = new SectionBuilder();
                serverSection.setThumbnailAccessory(new ThumbnailBuilder().setURL(targetMember.displayAvatarURL()));
                serverSection.addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("## <:home:1468487632328589458> Server Membership"),
                    new TextDisplayBuilder().setContent(
                        `<:name:1468486108450127915> **Nickname:** ${targetMember.nickname || "None"}\n` +
                        `<:roles:1468486024089964654> **Roles:** ${targetMember.roles.cache.size - 1} (Highest: **@${targetMember.roles.highest.name}**)\n` +
                        `<:calendar:1470475413175144530> **Joined:** <t:${Math.floor(targetMember.joinedTimestamp / 1000)}:R>\n` +
                        `<:location:1468629967956086961> **Join Position:** ${Array.from(message.guild.members.cache.sort((a,b)=>a.joinedTimestamp-b.joinedTimestamp).values()).indexOf(targetMember)+1}/${message.guild.memberCount}`
                    )
                );
                container.addSectionComponents(serverSection);
            }

            container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
                     .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# <t:${Math.floor(Date.now()/1000)}:f>`));

            await message.reply({ 
                components: [container], 
                flags: [MessageFlags.IsComponentsV2, MessageFlags.SuppressNotifications],
                allowedMentions: { parse: [], repliedUser: false } 
            });

            if (tempEmoji) setTimeout(async () => { try { await tempEmoji.delete(); } catch (err) {} }, 5000);

        } catch (error) {
            console.error("Userinfo Error:", error);
            if (tempEmoji) tempEmoji.delete().catch(() => {});
        }
    }
};
