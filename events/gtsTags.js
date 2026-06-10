const { Events, MessageFlags, ContainerBuilder, SectionBuilder, TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize } = require('discord.js');
const { GTSHub, GTSServer } = require('../src/models/GTS');

function buildLogPayload(user, type, tagText) {
    const title = type === 'adopt' ? "## Tag Adopted" : "## Tag Removed";
    const desc = type === 'adopt' ? `<@${user.id}> starts adopting the tag!` : `<@${user.id}> stopped adopting the tag! 😭`;
    const color = type === 'adopt' ? 3447003 : 15548997; 
    
    return [
        new ContainerBuilder().setAccentColor(color).addSectionComponents(
            new SectionBuilder().addTextDisplayComponents(
                new TextDisplayBuilder().setContent(title),
                new TextDisplayBuilder().setContent(desc)
            )
        ).addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# 🕒 <t:${Math.floor(Date.now() / 1000)}:f>`))
    ];
}

module.exports = {
    name: Events.UserUpdate,
    async execute(oldUser, newUser, client) {
        if (newUser.bot) return;

        const oldGuildId = oldUser.primaryGuild?.identityGuildId;
        const newGuildId = newUser.primaryGuild?.identityGuildId;
        if (oldGuildId === newGuildId) return;

        const hub = await GTSHub.findOne();
        const mainGuild = hub ? client.guilds.cache.get(hub.mainServerId) : null;

        // TAG ADOPTED
        if (newGuildId) {
            const srvData = await GTSServer.findOne({ serverId: newGuildId });
            if (srvData) {
                // Apply Main Server Roles
                if (mainGuild) {
                    const mainMember = await mainGuild.members.fetch(newUser.id).catch(() => null);
                    if (mainMember) {
                        if (hub.defaultTagRole) await mainMember.roles.add(hub.defaultTagRole).catch(() => {});
                        if (srvData.mainTagRole) await mainMember.roles.add(srvData.mainTagRole).catch(() => {});
                    }
                    if (srvData.mainLogChannel) {
                        const ch = mainGuild.channels.cache.get(srvData.mainLogChannel);
                        if (ch) ch.send({ components: buildLogPayload(newUser, 'adopt', srvData.tagText), flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
                    }
                }
                // Apply Local Roles
                const localGuild = client.guilds.cache.get(newGuildId);
                if (localGuild) {
                    const localMember = await localGuild.members.fetch(newUser.id).catch(() => null);
                    if (localMember && srvData.localTagRole) await localMember.roles.add(srvData.localTagRole).catch(() => {});
                    if (srvData.localLogChannel) {
                        const ch = localGuild.channels.cache.get(srvData.localLogChannel);
                        if (ch) ch.send({ components: buildLogPayload(newUser, 'adopt', srvData.tagText), flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
                    }
                }
            }
        }

        // TAG REMOVED
        if (oldGuildId) {
            const srvData = await GTSServer.findOne({ serverId: oldGuildId });
            if (srvData) {
                if (mainGuild) {
                    const mainMember = await mainGuild.members.fetch(newUser.id).catch(() => null);
                    if (mainMember) {
                        if (hub.defaultTagRole) await mainMember.roles.remove(hub.defaultTagRole).catch(() => {});
                        if (srvData.mainTagRole) await mainMember.roles.remove(srvData.mainTagRole).catch(() => {});
                    }
                    if (srvData.mainLogChannel) {
                        const ch = mainGuild.channels.cache.get(srvData.mainLogChannel);
                        if (ch) ch.send({ components: buildLogPayload(newUser, 'remove', srvData.tagText), flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
                    }
                }
                const localGuild = client.guilds.cache.get(oldGuildId);
                if (localGuild) {
                    const localMember = await localGuild.members.fetch(newUser.id).catch(() => null);
                    if (localMember && srvData.localTagRole) await localMember.roles.remove(srvData.localTagRole).catch(() => {});
                    if (srvData.localLogChannel) {
                        const ch = localGuild.channels.cache.get(srvData.localLogChannel);
                        if (ch) ch.send({ components: buildLogPayload(newUser, 'remove', srvData.tagText), flags: [MessageFlags.IsComponentsV2] }).catch(() => {});
                    }
                }
            }
        }
    }
};
