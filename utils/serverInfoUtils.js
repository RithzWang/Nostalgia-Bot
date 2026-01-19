// ⚠️ Ensure your discord.js version supports these experimental builders
const { 
    TextDisplayBuilder, 
    SeparatorBuilder, 
    SeparatorSpacingSize, 
    ButtonBuilder, 
    ButtonStyle, 
    SectionBuilder, 
    ContainerBuilder 
} = require('discord.js');

// === CONFIGURATION ===
const SERVER_1_ID = '1456197054782111756'; // Qahtani ID
const SERVER_2_ID = '1348929026445803530'; // Mutairi ID

const TAG_TEXT_SERVER_1 = 'A2-Q'; 
const TAG_TEXT_SERVER_2 = 'A2-Q'; 

// === HELPER: COUNT TAGS ===
async function getTagCount(guild, tagText) {
    if (!guild) return 0;
    // Force fetch members to ensure cache is full
    await guild.members.fetch().catch(() => null);
    
    return guild.members.cache.filter(m => 
        m.displayName.toLowerCase().includes(tagText.toLowerCase())
    ).size;
}

// === MAIN LOGIC: BUILD PAYLOAD ===
async function generateServerInfoPayload(client) {
    const guild1 = client.guilds.cache.get(SERVER_1_ID);
    const guild2 = client.guilds.cache.get(SERVER_2_ID);

    // Get Data (Default to 0 if bot isn't in the server)
    const g1Count = guild1 ? guild1.memberCount : 0;
    const g2Count = guild2 ? guild2.memberCount : 0;
    const totalMembers = g1Count + g2Count;

    const g1TagCount = await getTagCount(guild1, TAG_TEXT_SERVER_1);
    const g2TagCount = await getTagCount(guild2, TAG_TEXT_SERVER_2);

    // Next update timestamp (5 mins from now)
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
            // --- SERVER 1 (Qahtani) ---
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
            // --- SERVER 2 (Mutairi) ---
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
            // --- FOOTER ---
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(`### 🔁 Next Update: <t:${nextUpdateUnix}:R>`),
            ),
    ];

    return components;
}

module.exports = { generateServerInfoPayload };
