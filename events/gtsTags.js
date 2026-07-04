const { 
    Events, MessageFlags, ContainerBuilder, SectionBuilder, 
    TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize,
    ThumbnailBuilder 
} = require('discord.js');
const { GTSHub, GTSServer } = require('../src/models/GTS');

// Builds the V2 Component UI
function buildLogPayload(user, type, tagName, serverName, isMainServer, imageUrl) {
    const isAdopt = type === 'adopt';
    const accentColor = isAdopt ? 3447003 : 15548997; 
    const titleText = isAdopt ? "## Tag Adopted" : "## Tag Removed";
    
    let contentString = "";
    if (isMainServer) {
        // MAIN SERVER LOG: Includes "from **Server**" ONLY if we successfully caught the server name
        if (serverName) {
            contentString = isAdopt 
                ? `<@${user.id}> starts adopting **${tagName}** tag from **${serverName}**`
                : `<@${user.id}> stopped adopting **${tagName}** tag from **${serverName}**`;
        } else {
            contentString = isAdopt 
                ? `<@${user.id}> starts adopting the **${tagName}** tag`
                : `<@${user.id}> stopped adopting the **${tagName}** tag`;
        }
    } else {
        // LOCAL SERVER LOG: Keeps "our", drops "from **Server**"
        contentString = isAdopt 
            ? `<@${user.id}> starts adopting our **${tagName}** tag`
            : `<@${user.id}> stopped adopting our **${tagName}** tag`;
    }

    const container = new ContainerBuilder().setAccentColor(accentColor);
    const section = new SectionBuilder();

    // Only sets a thumbnail if a valid Server Tag Badge Pack icon is provided
    if (imageUrl) {
        section.setThumbnailAccessory(new ThumbnailBuilder().setURL(imageUrl));
    }

    section.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(titleText),
        new TextDisplayBuilder().setContent(contentString)
    );

    container.addSectionComponents(section)
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
                // Try cache first, fallback to API fetch to guarantee we get the name if possible
                let localGuild = client.guilds.cache.get(newGuildId);
                if (!localGuild) localGuild = await client.guilds.fetch(newGuildId).catch(() => null);
                
                const serverName = localGuild ? localGuild.name : null; // Passes null if truly unreachable
                
                const badgeHash = newUser.primaryGuild?.badge;
                const thumbnailImg = badgeHash 
                    ? `https://cdn.discordapp.com/guild-tag-badges/${newGuildId}/${badgeHash}.png?size=256` 
                    : null;

                // Fallback hierarchy: Discord Identity Name -> Database Tag Text -> "Server"
                const liveTagName = newUser.primaryGuild?.name || srvData.tagText || "Server";

                // Main Server Log
                if (mainGuild) {
                    const mainMember = await mainGuild.members.fetch(newUser.id).catch(() => null);
                    if (mainMember) {
                        if (hub.defaultTagRole) await mainMember.roles.add(hub.defaultTagRole).catch(() => {});
                        if (srvData.mainTagRole) await mainMember.roles.add(srvData.mainTagRole).catch(() => {});
                    }
                    if (srvData.mainLogChannel) {
                        const mainPayload = buildLogPayload(newUser, 'adopt', liveTagName, serverName, true, thumbnailImg);
                        const ch = mainGuild.channels.cache.get(srvData.mainLogChannel);
                        if (ch) ch.send({ 
                            components: mainPayload, 
                            flags: [MessageFlags.IsComponentsV2], 
                            allowedMentions: { parse: [] } // ✅ Mentions strictly purged
                        }).catch(err => console.error("Log Send Error:", err));
                    }
                }
                
                // Local Server Log
                if (localGuild) {
                    const localMember = await localGuild.members.fetch(newUser.id).catch(() => null);
                    if (localMember && srvData.localTagRole) await localMember.roles.add(srvData.localTagRole).catch(() => {});
                    if (srvData.localLogChannel) {
                        const localPayload = buildLogPayload(newUser, 'adopt', liveTagName, serverName, false, thumbnailImg);
                        const ch = localGuild.channels.cache.get(srvData.localLogChannel);
                        if (ch) ch.send({ 
                            components: localPayload, 
                            flags: [MessageFlags.IsComponentsV2], 
                            allowedMentions: { parse: [] } // ✅ Mentions strictly purged
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
                let localGuild = client.guilds.cache.get(oldGuildId);
                if (!localGuild) localGuild = await client.guilds.fetch(oldGuildId).catch(() => null);
                
                const serverName = localGuild ? localGuild.name : null;
                
                const badgeHash = oldUser.primaryGuild?.badge;
                const thumbnailImg = badgeHash 
                    ? `https://cdn.discordapp.com/guild-tag-badges/${oldGuildId}/${badgeHash}.png?size=256` 
                    : null;

                const liveTagName = oldUser.primaryGuild?.name || srvData.tagText || "Server";

                // Main Server Log
                if (mainGuild) {
                    const mainMember = await mainGuild.members.fetch(newUser.id).catch(() => null);
                    if (mainMember) {
                        if (hub.defaultTagRole) await mainMember.roles.remove(hub.defaultTagRole).catch(() => {});
                        if (srvData.mainTagRole) await mainMember.roles.remove(srvData.mainTagRole).catch(() => {});
                    }
                    if (srvData.mainLogChannel) {
                        const mainPayload = buildLogPayload(newUser, 'remove', liveTagName, serverName, true, thumbnailImg);
                        const ch = mainGuild.channels.cache.get(srvData.mainLogChannel);
                        if (ch) ch.send({ 
                            components: mainPayload, 
                            flags: [MessageFlags.IsComponentsV2], 
                            allowedMentions: { parse: [] } // ✅ Mentions strictly purged
                        }).catch(err => console.error("Log Send Error:", err));
                    }
                }
                
                // Local Server Log
                if (localGuild) {
                    const localMember = await localGuild.members.fetch(newUser.id).catch(() => null);
                    if (localMember && srvData.localTagRole) await localMember.roles.remove(srvData.localTagRole).catch(() => {});
                    if (srvData.localLogChannel) {
                        const localPayload = buildLogPayload(newUser, 'remove', liveTagName, serverName, false, thumbnailImg);
                        const ch = localGuild.channels.cache.get(srvData.localLogChannel);
                        if (ch) ch.send({ 
                            components: localPayload, 
                            flags: [MessageFlags.IsComponentsV2], 
                            allowedMentions: { parse: [] } // ✅ Mentions strictly purged
                        }).catch(err => console.error("Log Send Error:", err));
                    }
                }
            }
        }
    }
};
