const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
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

// ==========================================
// CONFIGURATION
// ==========================================
const SERVER_1_ID = '1456197054782111756'; // Qahtani ID
const SERVER_2_ID = '1348929026445803530'; // Mutairi ID

const TAG_TEXT_SERVER_1 = 'A2-Q'; 
const TAG_TEXT_SERVER_2 = 'A2-Q'; 

// ==========================================
// HELPERS
// ==========================================
async function getTagCount(guild, tagText) {
    if (!guild) return 0;
    await guild.members.fetch().catch(() => null);
    return guild.members.cache.filter(m => 
        m.displayName.toLowerCase().includes(tagText.toLowerCase())
    ).size;
}

async function generateServerInfoPayload(client) {
    const guild1 = client.guilds.cache.get(SERVER_1_ID);
    const guild2 = client.guilds.cache.get(SERVER_2_ID);

    const g1Count = guild1 ? guild1.memberCount : 0;
    const g2Count = guild2 ? guild2.memberCount : 0;
    const totalMembers = g1Count + g2Count;

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

// ==========================================
// COMMAND
// ==========================================
module.exports = {
    data: new SlashCommandBuilder()
        .setName('servers-info')
        .setDescription('Setup the live server info display')
        // 🔒 LOCK COMMAND TO ADMINS ONLY
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) 
        .addStringOption(option => 
            option.setName('message_id')
                .setDescription('The ID of the existing message to edit (optional)')
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel where the message is (optional)')
                .setRequired(false)),

    async execute(interaction) {
        // Double security check (optional, but good practice)
        if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
             return interaction.reply({ content: '❌ You do not have permission to use this.', ephemeral: true });
        }

        await interaction.deferReply({ ephemeral: true });

        const targetMessageId = interaction.options.getString('message_id');
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
        const client = interaction.client;

        try {
            const payloadComponents = await generateServerInfoPayload(client);
            
            let message;

            if (targetMessageId) {
                try {
                    message = await targetChannel.messages.fetch(targetMessageId);
                    await message.edit({ components: payloadComponents });
                    await interaction.editReply(`✅ **Updated!** Showing info in ${targetChannel}.`);
                } catch (e) {
                    return interaction.editReply(`❌ Could not find message ID ${targetMessageId} in ${targetChannel}.`);
                }
            } else {
                message = await targetChannel.send({ components: payloadComponents });
                await interaction.editReply(`✅ **Created!** Live info sent to ${targetChannel}.`);
            }

            // Simple Auto-Update Interval (Lasts until bot restarts)
            if (message) {
                const intervalTime = 5 * 60 * 1000; 
                
                setInterval(async () => {
                    try {
                        const newComponents = await generateServerInfoPayload(client);
                        await message.edit({ components: newComponents });
                    } catch (err) {
                        console.error('[Auto-Update] Failed:', err);
                    }
                }, intervalTime);
            }

        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ An error occurred.');
        }
    },
};
