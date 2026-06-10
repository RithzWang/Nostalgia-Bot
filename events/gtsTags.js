const { 
    Events, MessageFlags, ContainerBuilder, SectionBuilder, 
    TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize 
} = require('discord.js');
const { GTSHub, GTSServer } = require('../src/models/GTS');
const { updateGTSDashboard } = require('../utils/gtsManager'); 

function buildLogPayload(user, type, tagText, serverName) {
    const isAdopt = type === 'adopt';
    const title = isAdopt ? "# ✅ Tag Adopted" : "# ❌ Tag Removed";
    const accentColor = isAdopt ? 3066993 : 15158332; 
    
    const contentString = isAdopt 
        ? `## ${user.username}\n<:id:1468487725912166596> **User ID:** \`${user.id}\`\n<:badge:1468618581427097724> **Server Tag:** \`${tagText}\`\n<:members:1468470163081924608> **Status:** 🎉 Now representing **${serverName}**!`
        : `## ${user.username}\n<:id:1468487725912166596> **User ID:** \`${user.id}\`\n<:badge:1468618581427097724> **Server Tag:** \`${tagText}\`\n<:members:1468470163081924608> **Status:** 😭 Stopped representing **${serverName}**.`;

    const container = new ContainerBuilder()
        .setAccentColor(accentColor)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(title))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addSectionComponents(new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(contentString)))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# 🕒 <t:${Math.floor(Date.now() / 1000)}:R>`));

    return [container];
}

module.exports = {
    name: Events.UserUpdate,
    async execute(oldUser, newUser) {
        if (newUser.bot) return;

        // ✅ Securely fetch client from the user object
        const client = newUser.client; 

        const oldGuildId = oldUser.primaryGuild?.identityGuildId;
        const newGuildId = newUser.primaryGuild?.identityGuildId;
        
        if (oldGuildId === newGuildId) return;

        const hub = await GTSHub.findOne();
        const mainGuild = hub ? client.guilds.cache.get(hub.mainServerId) : null;
        let statsChanged = false;

        // ==========================================
        // 1. TAG ADOPTED
        // ==========================================
        if (newGuildId) {
            const srvData = await GTSServer.findOne({ serverId: newGuildId });
            if (srvData) {
                statsChanged = true;
                const localGuild = client.guilds.cache.get(newGuildId);
                const srvName = localGuild ? localGuild.name : "Unknown Server";
                const payload = buildLogPayload(newUser, 'adopt', srvData.tagText, srvName);

                if (mainGuild) {
                    const mainMember = await mainGuild.members.fetch(newUser.id).catch(() => null);
                    if (mainMember) {
                        if (hub.defaultTagRole) await mainMember.roles.add(hub.defaultTagRole).catch(() => {});
                        if (srvData.mainTagRole) await mainMember.roles.add(srvData.mainTagRole).catch(() => {});
                    }
                    if (srvData.mainLogChannel) {
                        const ch = mainGuild.channels.cache.get(srvData.mainLogChannel);
                        if (ch) ch.send({ components: payload, flags: [MessageFlags.IsComponentsV2] }).catch(err => console.error("Log Send Error:", err));
                    }
                }
                
                if (localGuild) {
                    const localMember = await localGuild.members.fetch(newUser.id).catch(() => null);
                    if (localMember && srvData.localTagRole) await localMember.roles.add(srvData.localTagRole).catch(() => {});
                    if (srvData.localLogChannel) {
                        const ch = localGuild.channels.cache.get(srvData.localLogChannel);
                        if (ch) ch.send({ components: payload, flags: [MessageFlags.IsComponentsV2] }).catch(err => console.error("Log Send Error:", err));
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
                statsChanged = true;
                const localGuild = client.guilds.cache.get(oldGuildId);
                const srvName = localGuild ? localGuild.name : "Unknown Server";
                const payload = buildLogPayload(newUser, 'remove', srvData.tagText, srvName);

                if (mainGuild) {
                    const mainMember = await mainGuild.members.fetch(newUser.id).catch(() => null);
                    if (mainMember) {
                        if (hub.defaultTagRole) await mainMember.roles.remove(hub.defaultTagRole).catch(() => {});
                        if (srvData.mainTagRole) await mainMember.roles.remove(srvData.mainTagRole).catch(() => {});
                    }
                    if (srvData.mainLogChannel) {
                        const ch = mainGuild.channels.cache.get(srvData.mainLogChannel);
                        if (ch) ch.send({ components: payload, flags: [MessageFlags.IsComponentsV2] }).catch(err => console.error("Log Send Error:", err));
                    }
                }
                
                if (localGuild) {
                    const localMember = await localGuild.members.fetch(newUser.id).catch(() => null);
                    if (localMember && srvData.localTagRole) await localMember.roles.remove(srvData.localTagRole).catch(() => {});
                    if (srvData.localLogChannel) {
                        const ch = localGuild.channels.cache.get(srvData.localLogChannel);
                        if (ch) ch.send({ components: payload, flags: [MessageFlags.IsComponentsV2] }).catch(err => console.error("Log Send Error:", err));
                    }
                }
            }
        }

        if (statsChanged) updateGTSDashboard(client).catch(() => {});
    }
};
