const { 
    ContainerBuilder, TextDisplayBuilder, ThumbnailBuilder, SectionBuilder, 
    ButtonBuilder, ButtonStyle, SeparatorBuilder, SeparatorSpacingSize,
    MessageFlags 
} = require('discord.js');
const TrackedServer = require('../src/models/TrackedServerSchema');
const DashboardLocation = require('../src/models/DashboardLocationSchema');

// [ ... runRoleUpdates function remains the same ... ]

async function generateDashboardPayload(client) {
    const servers = await TrackedServer.find();
    let totalNetworkMembers = 0;
    const serverSections = [];

    // 1. Calculate Data & Build Server List
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

    const nextUpdateUnix = Math.floor((Date.now() + 60 * 1000) / 1000);

    // 2. Create the Header Section (Text + Thumbnail)
    // ⚠️ REPLACE THIS URL WITH A PERMANENT ONE OR IT WILL BREAK TOMORROW
    const PERMANENT_IMAGE_URL = "https://cdn.discordapp.com/attachments/853503167706693632/1463148760866750560/Untitled206_20260120193001.png?ex=6970c6f8&is=696f7578&hm=a6599d4f5977662dde83dcd1824493dededddb90fc9b7b9d918918b637562727&"; 

    const headerSection = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(`# A2-Qabīlatān – القبيلتان\n Total Members : ${totalNetworkMembers}`)
        )
        // ✅ Thumbnail goes HERE (inside the Section, not the Container)
        .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(PERMANENT_IMAGE_URL)
        );
    
    // 3. Build Main Container
    const container = new ContainerBuilder()
        .setSpoiler(false)
        // Add the Header Section created above
        .addSectionComponents(headerSection)
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true));

    // 4. Add Server Sections
    for (let i = 0; i < serverSections.length; i++) {
        container.addSectionComponents(serverSections[i]);
        
        const isLastItem = i === serverSections.length - 1;
        const spacingSize = isLastItem ? SeparatorSpacingSize.Large : SeparatorSpacingSize.Small;
        const visibleType = isLastItem ? true : false;

        container.addSeparatorComponents(
            new SeparatorBuilder().setSpacing(spacingSize).setDivider(visibleType)
        );
    }

    // 5. Footer
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# <a:loading:1447184742934909032> Next Update: <t:${nextUpdateUnix}:R>`)
    );

    return [container];
}

// [ ... updateAllDashboards function remains the same ... ]

module.exports = { runRoleUpdates, generateDashboardPayload, updateAllDashboards };
