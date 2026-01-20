const { 
    ContainerBuilder, TextDisplayBuilder, ThumbnailBuilder, SectionBuilder, 
    ButtonBuilder, ButtonStyle, SeparatorBuilder, SeparatorSpacingSize,
    MessageFlags 
} = require('discord.js');
const TrackedServer = require('../src/models/TrackedServerSchema');
const DashboardLocation = require('../src/models/DashboardLocationSchema');

// ==========================================
// 1. ROLE MANAGER
// ==========================================
async function runRoleUpdates(client) {
    const servers = await TrackedServer.find();
    
    for (const serverData of servers) {
        if (!serverData.roleId) continue;

        const guild = client.guilds.cache.get(serverData.guildId);
        if (!guild) continue; 

        try {
            const role = guild.roles.cache.get(serverData.roleId);
            if (!role) continue; 

            await guild.members.fetch({ force: true });

            for (const [id, member] of guild.members.cache) {
                if (member.user.bot) continue;

                const userTagData = member.user.primaryGuild;
                const hasRole = member.roles.cache.has(role.id);

                const isWearingTag = userTagData && 
                                     userTagData.identityGuildId === serverData.guildId &&
                                     userTagData.identityEnabled === true;

                if (isWearingTag && !hasRole) {
                    await member.roles.add(role).catch(() => {});
                }
                else if (!isWearingTag && hasRole) {
                    await member.roles.remove(role).catch(() => {});
                }
            }
        } catch (e) {
            console.error(`[Role Manager] Error in ${serverData.displayName}:`, e.message);
        }
    }
}

// ==========================================
// 2. DASHBOARD UI GENERATOR
// ==========================================
async function generateDashboardPayload(client) {
    const servers = await TrackedServer.find();
    let totalNetworkMembers = 0;
    const serverSections = [];

    for (const data of servers) {
        const guild = client.guilds.cache.get(data.guildId);
        const memberCount = guild ? guild.memberCount : 0;
        totalNetworkMembers += memberCount;
        
        let tagUserCount = 0;
        let isRoleValid = false;

        if (guild && data.roleId) {
            const role = guild.roles.cache.get(data.roleId);
            if (role) {
                tagUserCount = role.members.size; 
                isRoleValid = true;
            }
        }

        const displayTagCount = isRoleValid ? `${tagUserCount}` : "`not available yet`";
        const displayTagText = data.tagText || "None";

        const section = new SectionBuilder()
            .setButtonAccessory(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setLabel("Join Server")
                    .setURL(data.inviteLink || "https://discord.gg/")
                    .setDisabled(!data.inviteLink)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(
                        `## [${data.displayName}](${data.inviteLink})\n` +
                        `**<:sparkles:1462851309219872841> Server Tag:** ${displayTagText}\n` +
                        `**<:members:1462851249836654592> Members:** ${memberCount}\n` +
                        `**<:greysword:1462853724824404069> Tag Users:** ${displayTagCount}`
                    )
            );
        serverSections.push(section);
    }

    // 👇 CHANGED: 1 Minute (60 * 1000)
    const nextUpdateUnix = Math.floor((Date.now() + 60 * 1000) / 1000);
    
    const container = new ContainerBuilder()
        .setSpoiler(false)
        .setThumbnailAccessory(
                        new ThumbnailBuilder()
                            .setURL("https://cdn.discordapp.com/attachments/853503167706693632/1463148760866750560/Untitled206_20260120193001.png?ex=6970c6f8&is=696f7578&hm=a6599d4f5977662dde83dcd1824493dededddb90fc9b7b9d918918b637562727&")
                    )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# A2-Qabīlatān – القبيلتان\n Total Members : ${totalNetworkMembers}`)
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true));

    for (let i = 0; i < serverSections.length; i++) {
        container.addSectionComponents(serverSections[i]);
        
        const isLastItem = i === serverSections.length - 1;
        const spacingSize = isLastItem ? SeparatorSpacingSize.Large : SeparatorSpacingSize.Small;
        const visibleType = isLastItem ? true : false;

        container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(spacingSize).setDivider(visibleType)
        );
    }

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# <a:loading:1447184742934909032> Next Update: <t:${nextUpdateUnix}:R>`)
    );

    return [container];
}

// ==========================================
// 3. MASTER UPDATE FUNCTION
// ==========================================
async function updateAllDashboards(client) {
    console.log('[Dashboard] Starting Global Update Cycle...');

    await runRoleUpdates(client);
    const payload = await generateDashboardPayload(client);
    const locations = await DashboardLocation.find();
    
    for (const loc of locations) {
        const channel = client.channels.cache.get(loc.channelId);
        if (!channel) continue;

        try {
            const msg = await channel.messages.fetch(loc.messageId);
            await msg.edit({ 
                components: payload,
                flags: [MessageFlags.IsComponentsV2]
            });
        } catch (e) {
            console.log(`[Dashboard] Failed to update in Guild ${loc.guildId}: ${e.message}`);
        }
    }
    if (locations.length > 0) console.log(`[Dashboard] Updated ${locations.length} dashboards.`);
}

module.exports = { runRoleUpdates, generateDashboardPayload, updateAllDashboards };
