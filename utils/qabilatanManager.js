const { 
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, 
    SeparatorSpacingSize, SectionBuilder, ButtonBuilder, 
    ButtonStyle, ActionRowBuilder 
} = require('discord.js');
const { Panel, ServerList } = require('../src/models/Qabilatan'); // Adjust path
const moment = require('moment');

const MAIN_SERVER_ID = "1456197054782111756"; // A2-Q Main Server

async function buildDashboard(client) {
    const servers = await ServerList.find();
    const mainGuild = client.guilds.cache.get(MAIN_SERVER_ID);

    // 1. Calculate Global Stats
    let totalMembers = 0;
    let totalAdopters = 0;

    // We pre-calculate stats
    const serverSectionData = [];

    for (const srv of servers) {
        let memberCount = 0;
        let boosts = 0;
        let guildObj = client.guilds.cache.get(srv.serverId);
        
        if (guildObj) {
            memberCount = guildObj.memberCount;
            boosts = guildObj.premiumSubscriptionCount || 0;
        }

        // Calculate Tag Adopters (Members in MAIN server with the Tag Role)
        let adopters = 0;
        if (mainGuild && srv.tagRoleID) {
            const role = mainGuild.roles.cache.get(srv.tagRoleID);
            if (role) adopters = role.members.size;
        }

        totalMembers += memberCount;
        totalAdopters += adopters;

        // Status Line Logic
        let statusLine = "";
        if (boosts < 3) {
            statusLine = `<:no_boost:1463272235056889917> ${boosts}/3 Boosts Remaining`;
        } else if (!srv.tagText) {
             statusLine = `<:no_tag:1463272172201050336> Not Enabled*`;
        } else {
             statusLine = `<:greysword:1462853724824404069> Tag Adopters: ${adopters}`;
        }

        serverSectionData.push({
            name: srv.name || guildObj?.name || "Unknown Server",
            invite: srv.inviteLink,
            tag: srv.tagText || "None",
            members: memberCount,
            statusLine: statusLine
        });
    }

    // 2. Build Components
    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent("# <:A2Q_1:1466981218758426634><:A2Q_2:1466981281060360232> » Servers")
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Total Members: ${totalMembers}\n-# Total Tags Adopters: ${totalAdopters}`)
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)
        );

    // 3. Add Sections dynamically
    if (serverSectionData.length === 0) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent("No server added yet.")
        );
    } else {
        serverSectionData.forEach(s => {
            container.addSectionComponents(
                new SectionBuilder()
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Link)
                            .setLabel("Server Link")
                            .setURL(s.invite)
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`### [${s.name}](${s.invite})`),
                        new TextDisplayBuilder().setContent(`**<:sparkles:1462851309219872841> Server Tag: ${s.tag}\n<:members:1462851249836654592> Members: ${s.members}\n${s.statusLine}**`)
                    )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
            );
        });
    }

    // 4. Footer
    const nextUpdate = Math.floor((Date.now() + 60000) / 1000); // Current + 1 min
    container
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`-# Next Update: <t:${nextUpdate}:R>`)
        );

    return [container];
}

async function updateAllPanels(client) {
    const panels = await Panel.find();
    const components = await buildDashboard(client);

    for (const p of panels) {
        try {
            const channel = await client.channels.fetch(p.channelId).catch(() => null);
            if (!channel) continue;
            
            const msg = await channel.messages.fetch(p.messageId).catch(() => null);
            if (msg) {
                await msg.edit({ components: components });
            } else {
                // If message deleted, delete from DB
                await Panel.deleteOne({ _id: p._id });
            }
        } catch (e) {
            console.error(`Failed to update panel in ${p.guildId}:`, e);
        }
    }
}

module.exports = { buildDashboard, updateAllPanels };
