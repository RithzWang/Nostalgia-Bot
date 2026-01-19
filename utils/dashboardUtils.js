const { 
    ContainerBuilder, TextDisplayBuilder, SectionBuilder, 
    ButtonBuilder, ButtonStyle, SeparatorBuilder, SeparatorSpacingSize 
} = require('discord.js');
const TrackedServer = require('../src/models/TrackedServerSchema');

// ==========================================
// 1. ROLE MANAGER (Auto-Giver)
// ==========================================
async function runRoleUpdates(client) {
    const servers = await TrackedServer.find();
    
    for (const serverData of servers) {
        // Skip if setup is incomplete
        if (!serverData.tagText || !serverData.roleId) continue;

        const guild = client.guilds.cache.get(serverData.guildId);
        if (!guild) continue; 

        try {
            const role = guild.roles.cache.get(serverData.roleId);
            if (!role) continue; 

            // Force fetch to see all members
            await guild.members.fetch();

            for (const [id, member] of guild.members.cache) {
                // Check name (case-insensitive)
                const hasTagInName = member.displayName.toLowerCase().includes(serverData.tagText.toLowerCase());
                const hasRole = member.roles.cache.has(role.id);

                // A. Give Role
                if (hasTagInName && !hasRole) {
                    await member.roles.add(role).catch(() => {});
                }
                // B. Remove Role (Optional: Remove if they change name)
                else if (!hasTagInName && hasRole) {
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
        
        // 1. Member Count
        const memberCount = guild ? guild.memberCount : 0;
        totalNetworkMembers += memberCount;
        
        // 2. Tag User Count (Based on Role)
        let tagUserCount = 0;
        let isRoleValid = false;

        if (guild && data.roleId) {
            const role = guild.roles.cache.get(data.roleId);
            if (role) {
                tagUserCount = role.members.size; // Count distinct members with role
                isRoleValid = true;
            }
        }

        // Format the "Tag User" line
        const displayTagCount = isRoleValid 
            ? `\`(${tagUserCount})\`` 
            : "`(Not available yet)`";

        // Format the "Server Tag" line (Using the Text input)
        const displayTagText = data.tagText || "None";

        // Build Section
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
                        `## ${data.displayName}\n` +
                        // 👇 UPDATED: Uses tagText
                        `### <:greysword:1462740515043938438> Server Tag : ${displayTagText}\n` +
                        `**<:member:1462768443546669076> Server Member :** \`(${memberCount})\`\n` +
                        // 👇 UPDATED: Uses Role Count
                        `**<:greysword_icon:1462768517685317778> Tag User :** ${displayTagCount}`
                    )
            );
        
        serverSections.push(section);
    }

    // Header Container
    const nextUpdateUnix = Math.floor((Date.now() + 5 * 60 * 1000) / 1000);
    
    const container = new ContainerBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(`# A2-Qabilatan Servers\n-# Total Members : \`(${totalNetworkMembers})\``)
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true)
        );

    // Add Server Sections
    for (const section of serverSections) {
        container.addSectionComponents(section);
        container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
        );
    }

    // Footer
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`### 🔁 Next Update: <t:${nextUpdateUnix}:R>`)
    );

    return [container];
}

module.exports = { runRoleUpdates, generateDashboardPayload };
