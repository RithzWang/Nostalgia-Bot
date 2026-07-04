const { 
    Events, MessageFlags, ContainerBuilder, SectionBuilder, 
    TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize,
    ThumbnailBuilder 
} = require('discord.js');
const { GTSHub, GTSServer } = require('../src/models/GTS');

// Builds the V2 Component UI
function buildLogPayload(user, type, tagText, serverName, isMainServer, imageUrl) {
    const isAdopt = type === 'adopt';
    const accentColor = isAdopt ? 3447003 : 15548997; 
    const titleText = isAdopt ? "## Tag Adopted" : "## Tag Removed";
    
    let contentString = "";
    if (isMainServer) {
        // MAIN SERVER LOG: Drops "our", includes "from **Server**"
        contentString = isAdopt 
            ? `<@${user.id}> starts adopting **${tagText}** tag from **${serverName}**`
            : `<@${user.id}> stopped adopting **${tagText}** tag from **${serverName}**`;
    } else {
        // LOCAL SERVER LOG: Keeps "our", drops "from **Server**", uses visual ping without parsing
        contentString = isAdopt 
            ? `<@${user.id}> starts adopting our **${tagText}** tag`
            : `<@${user.id}> stopped adopting our **${tagText}** tag`;
    }

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
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# <t:${Math.floor(Date.now() / 1000)}:f>`));

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
                const serverName = localGuild ? localGuild.name : "Unknown Server";
                
                const thumbnailImg = newUser.primaryGuild?.badge 
                    ? `https://cdn.discordapp.com/guild-tag-badges/${newGuildId}/${newUser.primaryGuild.badge}.png?size=256` 
                    : localGuild?.iconURL({ extension: 'png', size: 256 });

                const liveTagText = newUser.primaryGuild?.tag || srvData.tagText || "Unknown";

                // Main Server Log (isMainServer = true)
                if (mainGuild) {
                    const mainMember = await mainGuild.members.fetch(newUser.id).catch(() => null);
                    if (mainMember) {
                        if (hub.defaultTagRole) await mainMember.roles.add(hub.defaultTagRole).catch(() => {});
                        if (srvData.mainTagRole) await mainMember.roles.add(srvData.mainTagRole).catch(() => {});
                    }
                    if (srvData.mainLogChannel) {
                        const mainPayload = buildLogPayload(newUser, 'adopt', liveTagText, serverName, true, thumbnailImg);
                        const ch = mainGuild.channels.cache.get(srvData.mainLogChannel);
                        if (ch) ch.send({ 
                            components: mainPayload, 
                            flags: [MessageFlags.IsComponentsV2], 
                            allowedMentions: { parse: ['users'] } 
                        }).catch(err => console.error("Log Send Error:", err));
                    }
                }
                
                // Local Server Log (isMainServer = false)
                if (localGuild) {
                    const localMember = await localGuild.members.fetch(newUser.id).catch(() => null);
                    if (localMember && srvData.localTagRole) await localMember.roles.add(srvData.localTagRole).catch(() => {});
                    if (srvData.localLogChannel) {
                        const localPayload = buildLogPayload(newUser, 'adopt', liveTagText, serverName, false, thumbnailImg);
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
                const serverName = localGuild ? localGuild.name : "Unknown Server";
                
                const thumbnailImg = oldUser.primaryGuild?.badge 
                    ? `https://cdn.discordapp.com/guild-tag-badges/${oldGuildId}/${oldUser.primaryGuild.badge}.png?size=256` 
                    : localGuild?.iconURL({ extension: 'png', size: 256 });

                const liveTagText = oldUser.primaryGuild?.tag || srvData.tagText || "Unknown";

                // Main Server Log (isMainServer = true)
                if (mainGuild) {
                    const mainMember = await mainGuild.members.fetch(newUser.id).catch(() => null);
                    if (mainMember) {
                        if (hub.defaultTagRole) await mainMember.roles.remove(hub.defaultTagRole).catch(() => {});
                        if (srvData.mainTagRole) await mainMember.roles.remove(srvData.mainTagRole).catch(() => {});
                    }
                    if (srvData.mainLogChannel) {
                        const mainPayload = buildLogPayload(newUser, 'remove', liveTagText, serverName, true, thumbnailImg);
                        const ch = mainGuild.channels.cache.get(srvData.mainLogChannel);
                        if (ch) ch.send({ 
                            components: mainPayload, 
                            flags: [MessageFlags.IsComponentsV2], 
                            allowedMentions: { parse: ['users'] } 
                        }).catch(err => console.error("Log Send Error:", err));
                    }
                }
                
                // Local Server Log (isMainServer = false)
                if (localGuild) {
                    const localMember = await localGuild.members.fetch(newUser.id).catch(() => null);
                    if (localMember && srvData.localTagRole) await localMember.roles.remove(srvData.localTagRole).catch(() => {});
                    if (srvData.localLogChannel) {
                        const localPayload = buildLogPayload(newUser, 'remove', liveTagText, serverName, false, thumbnailImg);
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
