const { 
    ContainerBuilder, TextDisplayBuilder, SectionBuilder, 
    ButtonBuilder, ButtonStyle, SeparatorBuilder, SeparatorSpacingSize,
    ActionRowBuilder, MessageFlags 
} = require('discord.js');
const { GTSHub, GTSServer } = require('../src/models/GTS');

async function updateGTSDashboard(client) {
    const hub = await GTSHub.findOne();
    if (!hub || !hub.dashboardChannelId) return;

    const mainGuild = client.guilds.cache.get(hub.mainServerId);
    if (!mainGuild) return;

    const channel = mainGuild.channels.cache.get(hub.dashboardChannelId) || await client.channels.fetch(hub.dashboardChannelId).catch(() => null);
    if (!channel) return;

    const allServers = await GTSServer.find();
    
    // Globals
    let globalTagAdopters = 0;
    const mainHumanCount = mainGuild.members.cache.filter(m => !m.user.bot).size;

    const containers = [];

    // Container 1: Header & Main Server
    const mainData = allServers.find(s => s.serverId === hub.mainServerId) || {};
    let mainLocalTags = 0;
    for (const [id, m] of mainGuild.members.cache) {
        if (!m.user.bot && m.user.primaryGuild && m.user.primaryGuild.identityGuildId === hub.mainServerId) mainLocalTags++;
    }
    globalTagAdopters += mainLocalTags;

    const mainStatus = mainLocalTags > 0 ? `<:greysword:1462853724824404069> **Tag Adopters:** ${mainLocalTags}` : `<:no_tag:1468470099026510001> **Not Enabled**`;
    const boosts = mainGuild.premiumSubscriptionCount || 0;

    const headerContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent("# Tags Statistics"))
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setStyle(ButtonStyle.Secondary)
                .setLabel(`Total Tags Adopters: {TOTAL_TAGS}/${mainHumanCount}`) // Placeholder resolved below
                .setCustomId("stats_adopt_btn")
                .setDisabled(true)
            )
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
        .addSectionComponents(
            new SectionBuilder()
                .setButtonAccessory(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Server Link").setURL(mainData.inviteLink || "https://discord.com"))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## ${mainGuild.name}\n` +
                        `<:id:1468487725912166596> **ID:** \`${mainGuild.id}\`\n` +
                        `<:badge:1468618581427097724> **Server Tag:** ${mainData.tagText || "None"}\n` +
                        `<:members:1468470163081924608> **Members:** ${mainHumanCount}\n` +
                        `<:server_boost:1468633171758284872> ${boosts}\n( ${mainStatus} )`
                    )
                )
        );
    containers.push(headerContainer);

    // Container 2: Satellites
    const satellites = allServers.filter(s => s.serverId !== hub.mainServerId);
    if (satellites.length > 0) {
        const satContainer = new ContainerBuilder();
        
        satellites.forEach((satData, index) => {
            const guild = client.guilds.cache.get(satData.serverId);
            if (!guild) return;

            const humanCount = guild.members.cache.filter(m => !m.user.bot).size;
            const satBoosts = guild.premiumSubscriptionCount || 0;
            
            let satLocalTags = 0;
            for (const [id, m] of guild.members.cache) {
                if (!m.user.bot && m.user.primaryGuild && m.user.primaryGuild.identityGuildId === satData.serverId) satLocalTags++;
            }
            globalTagAdopters += satLocalTags;

            const satStatus = satLocalTags > 0 ? `<:greysword:1462853724824404069> **Tag Adopters:** ${satLocalTags}` : `<:no_tag:1468470099026510001> **Not Enabled**`;

            satContainer.addSectionComponents(
                new SectionBuilder()
                    .setButtonAccessory(new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel("Server Link").setURL(satData.inviteLink || "https://discord.com"))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `## ${guild.name}\n` +
                            `<:id:1468487725912166596> **ID:** \`${guild.id}\`\n` +
                            `<:badge:1468618581427097724> **Server Tag:** ${satData.tagText || "None"}\n` +
                            `<:members:1468470163081924608> **Members:** ${humanCount}\n` +
                            `<:server_boost:1468633171758284872> ${satBoosts}\n( ${satStatus} )`
                        )
                    )
            );

            if (index < satellites.length - 1) {
                satContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false));
            }
        });

        const nextUpdateUnix = Math.floor((Date.now() + 60 * 1000) / 1000);
        satContainer
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# <a:loading:1447184742934909032> Next Update: <t:${nextUpdateUnix}:R>`));
        
        containers.push(satContainer);
    }

    // Resolve Total Adopters
    headerContainer.components[1].components[0].data.label = `Total Tags Adopters: ${globalTagAdopters}/${mainHumanCount}`;

    // Send or Edit
    try {
        let msg = null;
        if (hub.dashboardMessageId) msg = await channel.messages.fetch(hub.dashboardMessageId).catch(() => null);
        if (msg && msg.editable) {
            await msg.edit({ components: containers, flags: [MessageFlags.IsComponentsV2] });
        } else {
            const newMsg = await channel.send({ components: containers, flags: [MessageFlags.IsComponentsV2] });
            hub.dashboardMessageId = newMsg.id;
            await hub.save();
        }
    } catch (err) {
        console.error("Dashboard Render Error:", err);
    }
}

module.exports = { updateGTSDashboard };
