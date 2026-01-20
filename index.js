const fs = require('fs');
const path = require('path');
const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    Collection, 
    EmbedBuilder,
    ActivityType, 
    AttachmentBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    REST, 
    Routes,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SectionBuilder,
    MediaGalleryBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ThumbnailBuilder 
} = require('discord.js');

const mongoose = require('mongoose');
const moment = require('moment-timezone');
const keep_alive = require('./keep_alive.js');
const { loadFonts } = require('./fontLoader');

// --- CONFIGURATION ---
const config = require("./config.json");

// ==========================================
// 🆕 GLOBAL DASHBOARD IMPORTS
// ==========================================
const DashboardLocation = require('./src/models/DashboardLocationSchema');
const { generateDashboardPayload, runRoleUpdates } = require('./utils/dashboardUtils');

const { prefix, serverID, welcomeLog, roleupdateLog, roleforLog, colourEmbed } = config;
let roleupdateMessageID = config.roleupdateMessageID || null;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildPresences,
    ],
    partials: [ Partials.Channel, Partials.Message, Partials.Reaction, Partials.GuildMember, Partials.User ],
});

// --- DYNAMIC LOADERS ---
client.prefixCommands = new Collection(); 
client.slashCommands = new Collection();
client.slashDatas = []; 

require('./handlers/commandHandler')(client);

// EVENT LOADER
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

const invitesCache = new Collection();

// --- READY EVENT ---
client.on('clientReady', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    // 1. Separate Commands into two lists
    const globalDatas = [];
    const guildDatas = [];

    client.slashCommands.forEach(cmd => {
        if (cmd.guildOnly) {
            guildDatas.push(cmd.data.toJSON());
        } else {
            globalDatas.push(cmd.data.toJSON());
        }
    });

    try {
        console.log(`Started refreshing ${globalDatas.length} global and ${guildDatas.length} guild commands.`);

        if (guildDatas.length > 0) {
            await rest.put(
                Routes.applicationGuildCommands(client.user.id, serverID),
                { body: guildDatas }
            );
            console.log('✅ Guild-only commands registered.');
        }

        if (globalDatas.length > 0) {
            await rest.put(
                Routes.applicationCommands(client.user.id),
                { body: globalDatas }
            );
            console.log('✅ Global commands registered.');
        }

    } catch (e) { console.error(e); }


    const guild = client.guilds.cache.get(serverID);
    if(guild) {
        const currentInvites = await guild.invites.fetch().catch(() => new Collection());
        currentInvites.each(invite => invitesCache.set(invite.code, invite.uses));
    }

    // Presence Interval
    setInterval(() => {
        const now = moment().tz('Asia/Bangkok');
        const formattedTime = now.format('HH:mm');
        const currentHour = now.hour();

        let timeEmoji = '🌙'; 

        if (currentHour >= 6 && currentHour < 9) {
            timeEmoji = '🌄'; 
        } else if (currentHour >= 9 && currentHour < 16) {
            timeEmoji = '☀️'; 
        } else if (currentHour >= 16 && currentHour < 18) {
            timeEmoji = '🌇'; 
        }

        client.user.setPresence({
            activities: [{ 
                name: 'customstatus', 
                type: ActivityType.Custom, 
                state: `${timeEmoji} ${formattedTime} (GMT+7)` 
            }],
            status: 'dnd'
        });

    }, 5000); 

    // ====================================================
    // 🌍 GLOBAL DASHBOARD CONTROLLER (3 MINS)
    // ====================================================
    async function updateAllDashboards() {
        console.log('[Dashboard] Starting Global Update Cycle...');

        // 1. Run Role Assignments
        await runRoleUpdates(client);

        // 2. Generate Fresh UI
        const payload = await generateDashboardPayload(client);

        // 3. Update all messages
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
        if (locations.length > 0) {
            console.log(`[Dashboard] Updated ${locations.length} dashboards.`);
        }
    }

    // A. Run immediately on startup
    updateAllDashboards();

    // B. Run every 3 minutes (changed from 5)
    setInterval(updateAllDashboards, 60 * 1000);
});


const { createWelcomeImage } = require('./welcomeCanvas6.js');

client.on('guildMemberAdd', async (member) => {
    if (member.user.bot || member.guild.id !== serverID) return;

    const rolesToAdd = ['1456238105345527932', '1456197055092625573'];
    try { 
        await member.roles.add(rolesToAdd); 
        setTimeout(() => member.setNickname(`🌱 • ${member.globalName}`.substring(0, 32)), 5000);
    } catch (e) {}

    try {
        const newInvites = await member.guild.invites.fetch().catch(() => new Collection());
        let usedInvite = newInvites.find(inv => inv.uses > (invitesCache.get(inv.code) || 0));
        newInvites.each(inv => invitesCache.set(inv.code, inv.uses));

        const displayName = member.user.globalName || member.user.username;

        const inviterName = usedInvite?.inviter ? usedInvite.inviter.username : 'Unknown';
        const inviterId = usedInvite?.inviter ? usedInvite.inviter.id : null;
        const inviteCode = usedInvite ? usedInvite.code : 'Unknown';

        const buffer = await createWelcomeImage(member);
        const attachment = new AttachmentBuilder(buffer, { name: 'welcome-image.png' });
        const accountCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;
        
        const mainContainer = new ContainerBuilder()
            .setAccentColor(0x888888)
            .addSectionComponents((section) => 
                section
                    .addTextDisplayComponents(
                        (header) => header.setContent('### Welcome to A2-Q Server'),
                        (body) => body.setContent(
                            `-# <@${member.user.id}> \`(${member.user.username})\`\n` +
                            `-# <:calendar:1456242387243499613> Account Created: ${accountCreated}\n` +
                            `-# <:users:1456242343303971009> Member Count: \`${member.guild.memberCount}\`\n` +
                            `-# <:chain:1456242418717556776> Invited by <@${inviterId || '0'}> \`(${inviterName})\` using [\`${inviteCode}\`](https://discord.gg/${inviteCode}) invite`
                        )
                    )
                    .setThumbnailAccessory((thumb) => 
                        thumb.setURL(member.user.displayAvatarURL())
                    )
            )
            .addActionRowComponents((row) => 
                row.setComponents(
                    new ButtonBuilder()
                        .setLabel('Register Here - Regístrate Aquí')
                        .setEmoji('1447143542643490848')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://discord.com/channels/1456197054782111756/1456197056250122352')
                )
            )
            .addSeparatorComponents((sep) => 
                sep.setSpacing(SeparatorSpacingSize.Small)
            )
            .addMediaGalleryComponents((gallery) => 
                gallery.addItems((item) => 
                    item.setURL("attachment://welcome-image.png").setDescription(`${displayName} (${member.user.username})`)
                )
            );

        const channel = client.channels.cache.get(welcomeLog);
        if (channel) {
            await channel.send({ 
                flags: [MessageFlags.IsComponentsV2],
                files: [attachment],
                components: [mainContainer],
                allowedMentions: { users: [member.user.id] } 
            });
        }

    } catch (e) { console.error("Welcome Error:", e); }
});

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_TOKEN, { dbName: 'MyBotData' });
        console.log("✅ MongoDB Connected.");
        await loadFonts(); 
        await client.login(process.env.TOKEN);
    } catch (e) { console.error(e); }
})();
