const { 
    TextDisplayBuilder, SeparatorBuilder, SeparatorSpacingSize, 
    ButtonBuilder, ButtonStyle, SectionBuilder, ContainerBuilder 
} = require('discord.js');

// ==========================================
// CONFIGURATION
// ==========================================
const SERVER_1_ID = '1456197054782111756'; // Qahtani ID
const SERVER_2_ID = '1348929026445803530'; // Mutairi ID

// The EXACT text of the official Server Tag (e.g. "A2-Q")
const TAG_TEXT_SERVER_1 = 'A2-Q'; 
const TAG_TEXT_SERVER_2 = 'A2-Q'; 

// ==========================================
// HELPER: COUNT OFFICIAL TAGS
// ==========================================
async function getTagCount(guild, targetTag) {
    if (!guild) return 0;
    try {
        // We must fetch members to ensure we have the latest User objects
        await guild.members.fetch(); 
        
        // Filter based on the OFFICIAL 'primaryGuild' property you provided
        return guild.members.cache.filter(member => {
            const user = member.user;
            
            // Check if the user has the primaryGuild object and if the tag matches
            if (user.primaryGuild && user.primaryGuild.tag === targetTag) {
                return true;
            }
            return false;
        }).size;

    } catch (e) {
        console.log(`[Warning] Could not count tags for guild ${guild.id}: ${e.message}`);
        return 0;
    }
}

// ==========================================
// MAIN LOGIC
// ==========================================
async function generateServerInfoPayload(client) {
    const guild1 = client.guilds.cache.get(SERVER_1_ID);
    const guild2 = client.guilds.cache.get(SERVER_2_ID);

    // 1. Get Member Counts
    const g1Count = guild1 ? guild1.memberCount : 0;
    const g2Count = guild2 ? guild2.memberCount : 0;
    const totalMembers = g1Count + g2Count;

    // 2. Get Official Tag Counts (Using the new logic)
    const g1TagCount = await getTagCount(guild1, TAG_TEXT_SERVER_1);
    const g2TagCount = await getTagCount(guild2, TAG_TEXT_SERVER_2);

    const nextUpdateUnix = Math.floor((Date.now() + 5 * 60 * 1000) / 1000);

    const components = [
        new ContainerBuilder()
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(`# A2-Qabilatan Servers\n-# Total Members : \`(${totalMembers})\``),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true),
            )
            // --- SERVER 1 ---
            .addSectionComponents(
                new SectionBuilder()
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Link)
                            .setLabel("Server Link")
                            .setURL("https://discord.gg/3pJPe9QUcs")
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`## A2-Q Qahtani\n### <:greysword:1462740515043938438> **Server Tag :** <:qahtani_tag1:1462760239676920014><:qahtani_tag2:1462760294873956474><:qahtani_tag3:1462760393641295914> \n**<:member:1462768443546669076> Server Member :** \`(${g1Count})\`\n<:greysword_icon:1462768517685317778> **Tag User :** \`(${g1TagCount})\``),
                    ),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
            )
            // --- SERVER 2 ---
            .addSectionComponents(
                new SectionBuilder()
                    .setButtonAccessory(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Link)
                            .setLabel("Server Link")
                            .setURL("https://discord.gg/hnAgXeJqWD")
                    )
                    .addTextDisplayComponents(
                        new TextDisplayBuilder()
                            .setContent(`## A2-Q Mutairi\n### <:greysword:1462740515043938438> Server Tag : <:mutairi_tag1:1462762017185333348><:mutairi_tag2:1462762067802067016><:mutairi_tag3:1462762108335947870>\n**<:member:1462768443546669076> Server Member :** \`(${g2Count})\`\n**<:greysword_icon:1462768517685317778> Tag User :** \`(${g2TagCount})\``),
                    ),
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large).setDivider(true),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(`### 🔁 Next Update: <t:${nextUpdateUnix}:R>`),
            ),
    ];

    return components;
}

module.exports = { generateServerInfoPayload };
