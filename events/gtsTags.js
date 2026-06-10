const { 
    Events, MessageFlags, ContainerBuilder, SectionBuilder, 
    TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize,
    ThumbnailBuilder 
} = require('discord.js');
const { GTSHub, GTSServer } = require('../src/models/GTS');

// Builds the V2 Component UI to match your new Tag Log layouts
function buildLogPayload(user, type, tagText, pingUser, imageUrl) {
    const isAdopt = type === 'adopt';
    const accentColor = isAdopt ? 3447003 : 15548997; 
    const titleText = isAdopt ? "## Tag Adopted" : "## Tag Removed";
    
    // Dynamically ping in Main, or just use username in Local
    const userDisplay = pingUser ? `<@${user.id}>` : `**${user.username}**`;
    
    const contentString = isAdopt 
        ? `${userDisplay} starts adopting our **${tagText}** tag`
        : `${userDisplay} stopped adopting our **${tagText}** tag`;

    const safeImage = imageUrl || "https://cdn.discordapp.com/embed/avatars/0.png";

    const container = new ContainerBuilder()
        .setAccentColor(accentColor)
        .addSectionComponents(
            new SectionBuilder()
                .setThumbnailAccessory(new ThumbnailBuilder().setURL(safeImage))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(titleText),
                    new TextDisplayBuilder().setContent(contentString)
                )
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`<t:${Math.floor(Date.now() / 1000)}:f>`));

    return [container];
}

module.exports = {
    name: Events.UserUpdate,
    async execute(oldUser, newUser) {
        if (newUser.bot) return;

        const client = newUser.client; 
        const oldGuildId = oldUser.primaryGuild?.identityGuildId;
        const newGuildId = newUser.primaryGuild?.identityGuildId;
        
        if (oldGuildId === newGuildId) return;

        const hub = await GTSHub.findOne();
        const mainGuild = hub ? client.guilds.cache.get(hub.mainServerId) : null;

        // ==========================================
        // 1. TAG ADOPTED
        // ==========================================
        if (newGuildId) {
            const srvData = await GTSServer.findOne({ serverId: newGuildId });
            if (srvData) {
                const localGuild = client.guilds.cache.get(newGuildId);
                
                // Fetch official Discord Guild Tag Badge, fallback to Guild Icon
                const thumbnailImg = newUser.primaryGuild?.badge 
                    ? `https://cdn.discordapp.com/guild-tag-badges/${newGuildId}/${newUser.primaryGuild.badge}.png?size=256` 
                    : localGuild?.iconURL({ extension: 'png', size: 256 });

                // Grab the LIVE tag name directly from Discord API (fallback to DB if missing)
                const liveTagText = newUser.primaryGuild?.tag || srvData.tagText || "Unknown";

                // Main Server Log (Ping User)
                if (mainGuild) {
                    const mainMember = await mainGuild.members.fetch(newUser.id).catch(() => null);
                    if (mainMember) {
                        if (hub.defaultTagRole) await mainMember.roles.add(hub.defaultTagRole).catch(() => {});
                        if (srvData.mainTagRole) await mainMember.roles.add(srvData.mainTagRole).catch(() => {});
                    }
                    if (srvData.mainLogChannel) {
                        const mainPayload = buildLogPayload(newUser, 'adopt', liveTagText, true, thumbnailImg);
                        const ch = mainGuild.channels.cache.get(srvData.mainLogChannel);
                        if (ch) ch.send({ 
                            components: mainPayload, 
                            flags: [MessageFlags.IsComponentsV2], 
                            allowedMentions: { parse: ['users'] } 
                        }).catch(err => console.error("Log Send Error:", err));
                    }
                }
                
                // Local Server Log (Do Not Ping User)
                if (localGuild) {
                    const localMember = await localGuild.members.fetch(newUser.id).catch(() => null);
                    if (localMember && srvData.localTagRole) await localMember.roles.add(srvData.localTagRole).catch(() => {});
                    if (srvData.localLogChannel) {
                        const localPayload = buildLogPayload(newUser, 'adopt', liveTagText, false, thumbnailImg);
                        const ch = localGuild.channels.cache.get(srvData.localLogChannel);
                        if (ch) ch.send({ 
                            components: localPayload, 
                            flags: [MessageFlags.IsComponentsV2], 
                            allowedMentions: { parse: [] } 
                        }).catch(err => console.error("Log Send Error:", err));
                    }
                }
            }
        }

        // ==========================================
        // 2. TAG REMOVED
        // ==========================================
        if (oldGuildId) {
            const srvData = await GTSServer.findOne({ serverId: oldGuildId });
            if (srvData) {
                const localGuild = client.guilds.cache.get(oldGuildId);
                
                // Fetch official Discord Guild Tag Badge from oldUser, fallback to Guild Icon
                const thumbnailImg = oldUser.primaryGuild?.badge 
                    ? `https://cdn.discordapp.com/guild-tag-badges/${oldGuildId}/${oldUser.primaryGuild.badge}.png?size=256` 
                    : localGuild?.iconURL({ extension: 'png', size: 256 });

                // Grab the LIVE tag name directly from Discord API (from oldUser state)
                const liveTagText = oldUser.primaryGuild?.tag || srvData.tagText || "Unknown";

                // Main Server Log (Ping User)
                if (mainGuild) {
                    const mainMember = await mainGuild.members.fetch(newUser.id).catch(() => null);
                    if (mainMember) {
                        if (hub.defaultTagRole) await mainMember.roles.remove(hub.defaultTagRole).catch(() => {});
                        if (srvData.mainTagRole) await mainMember.roles.remove(srvData.mainTagRole).catch(() => {});
                    }
                    if (srvData.mainLogChannel) {
                        const mainPayload = buildLogPayload(newUser, 'remove', liveTagText, true, thumbnailImg);
                        const ch = mainGuild.channels.cache.get(srvData.mainLogChannel);
                        if (ch) ch.send({ 
                            components: mainPayload, 
                            flags: [MessageFlags.IsComponentsV2], 
                            allowedMentions: { parse: ['users'] } 
                        }).catch(err => console.error("Log Send Error:", err));
                    }
                }
                
                // Local Server Log (Do Not Ping User)
                if (localGuild) {
                    const localMember = await localGuild.members.fetch(newUser.id).catch(() => null);
                    if (localMember && srvData.localTagRole) await localMember.roles.remove(srvData.localTagRole).catch(() => {});
                    if (srvData.localLogChannel) {
                        const localPayload = buildLogPayload(newUser, 'remove', liveTagText, false, thumbnailImg);
                        const ch = localGuild.channels.cache.get(srvData.localLogChannel);
                        if (ch) ch.send({ 
                            components: localPayload, 
                            flags: [MessageFlags.IsComponentsV2], 
                            allowedMentions: { parse: [] } 
                        }).catch(err => console.error("Log Send Error:", err));
                    }
                }
            }
        }
    }
};
