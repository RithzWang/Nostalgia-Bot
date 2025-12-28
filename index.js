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
    // v2 Components
    ContainerBuilder, 
    TextDisplayBuilder, 
    SeparatorBuilder,
    FileBuilder 
} = require('discord.js');

const mongoose = require('mongoose');
const moment = require('moment-timezone');
const keep_alive = require('./keep_alive.js');
const { loadFonts } = require('./fontLoader');

// --- CONFIGURATION ---
const config = require("./config.json");
const Giveaway = require('./src/models/Giveaway');

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
    try {
        await rest.put(Routes.applicationGuildCommands(client.user.id, serverID), { body: client.slashDatas });
        console.log('✅ Slash Commands Deployed.');
    } catch (e) { console.error(e); }

    const guild = client.guilds.cache.get(serverID);
    if(guild) {
        const currentInvites = await guild.invites.fetch().catch(() => new Collection());
        currentInvites.each(invite => invitesCache.set(invite.code, invite.uses));
    }

    setInterval(() => {
        const thailandTime = moment().tz('Asia/Bangkok').format('HH:mm');
        client.user.setPresence({
            activities: [{ name: 'customstatus', type: ActivityType.Custom, state: `⏳ ${thailandTime} (GMT+7)` }],
            status: 'idle' 
        });
    }, 30000);
});

// --- UPDATED WELCOMER (V2 All-in-One Container) ---
const { createWelcomeImage } = require('./welcomeCanvas.js');

client.on('guildMemberAdd', async (member) => {
    if (member.user.bot || member.guild.id !== serverID) return;

    try {
        const accountCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;
        const buffer = await createWelcomeImage(member);
        const attachment = new AttachmentBuilder(buffer, { name: 'welcome-image.png' });

        // 1. Define Builders
        const titleText = new TextDisplayBuilder().setContent(`### 👋 Welcome to ${member.guild.name}!`);
        const userTag = new TextDisplayBuilder().setContent(`<@${member.user.id}> \`(${member.user.username})\``);
        const statsText = new TextDisplayBuilder().setContent(
            `<:calendar:1439970556534329475> **Account Created:** ${accountCreated}\n` +
            `<:users:1439970561953501214> **Member Count:** \`${member.guild.memberCount}\`\n` +
            `<:chain:1439970559105564672> **Invited by** <@${member.id}> using a link.`
        );

        const welcomeImage = new FileBuilder().setURL('attachment://welcome-image.png');

        // 2. Build the Container
        // We use addComponents for the non-text items
        const container = new ContainerBuilder()
            .addTextDisplayComponents(titleText, userTag, statsText)
            .addComponents(
                new SeparatorBuilder(), 
                welcomeImage
            ); 

        // 3. Rows
        const linkRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel('Information').setStyle(ButtonStyle.Link).setURL('https://discord.com').setEmoji('📋'),
            new ButtonBuilder().setLabel('Chat').setStyle(ButtonStyle.Link).setURL('https://discord.com').setEmoji('💬')
        );

        const idRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setLabel(`${member.user.id}`).setStyle(ButtonStyle.Secondary).setEmoji('1441133157855395911').setCustomId('user_id_display').setDisabled(true)
        );

        const channel = client.channels.cache.get(welcomeLog);
        if (channel) {
            await channel.send({ 
                files: [attachment],
                flags: [MessageFlags.IsComponentsV2], // Enabling V2
                components: [ container, linkRow, idRow ]
            });
        }
    } catch (e) { console.error("Welcomer V2 Error:", e); }
});


// --- ROLE LOGGING ---
client.on('guildMemberUpdate', (oldMember, newMember) => {
    if (newMember.user.bot) return;
    const specifiedRolesSet = new Set(roleforLog);
    const addedRoles = newMember.roles.cache.filter(role => specifiedRolesSet.has(role.id) && !oldMember.roles.cache.has(role.id));
    const removedRoles = oldMember.roles.cache.filter(role => specifiedRolesSet.has(role.id) && !newMember.roles.cache.has(role.id));

    const logChannel = newMember.guild.channels.cache.get(roleupdateLog);
    if (!logChannel) return;

    const silentOptions = { allowedMentions: { parse: [] } };
    const formatRoles = (roles) => {
        const names = roles.map(role => `**${role.name}**`);
        if (names.length === 1) return names[0];
        if (names.length === 2) return `${names[0]} and ${names[1]}`;
        return `${names.slice(0, -1).join(', ')}, and ${names.slice(-1)}`;
    };

    const plural = (roles) => roles.size === 1 ? 'role' : 'roles';
    let content = '';

    if (addedRoles.size > 0 && removedRoles.size > 0) {
        content = `<:yes:1297814648417943565> ${newMember.user} has been added ${formatRoles(addedRoles)} ${plural(addedRoles)} and removed ${formatRoles(removedRoles)} ${plural(removedRoles)}!`;
    } else if (addedRoles.size > 0) {
        content = `<:yes:1297814648417943565> ${newMember.user} has been added ${formatRoles(addedRoles)} ${plural(addedRoles)}!`;
    } else if (removedRoles.size > 0) {
        content = `<:yes:1297814648417943565> ${newMember.user} has been removed ${formatRoles(removedRoles)} ${plural(removedRoles)}!`;
    }

    if (!content) return;
    if (roleupdateMessageID) {
        logChannel.messages.fetch(roleupdateMessageID).then(m => m.edit({ content, ...silentOptions })).catch(() => {
            logChannel.send({ content, ...silentOptions }).then(m => roleupdateMessageID = m.id);
        });
    } else {
        logChannel.send({ content, ...silentOptions }).then(m => roleupdateMessageID = m.id);
    }
});

// --- GIVEAWAY LOOP ---
setInterval(async () => {
    const endedGiveaways = await Giveaway.find({ ended: false, endTimestamp: { $lte: Date.now() } });
    for (const g of endedGiveaways) {
        try {
            const channel = client.channels.cache.get(g.channelId);
            const message = await channel?.messages.fetch(g.messageId).catch(() => null);
            if (!message) continue;

            let winnersText = "No valid entries.";
            if (g.participants.length > 0) {
                const winners = g.participants.sort(() => 0.5 - Math.random()).slice(0, g.winnersCount);
                winnersText = winners.map(id => `<@${id}>`).join(', ');
                await channel.send(`🎉 **CONGRATULATIONS!**\n${winnersText}, You won **${g.prize}**!`);
            }

            const container = new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`# 🎉 ${g.prize}`),
                    new TextDisplayBuilder().setContent(`**Winner(s):** ${winnersText}\n**Host:** <@${g.hostId}>\n**Ended:** <t:${Math.floor(g.endTimestamp / 1000)}:R>`)
                );

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('giveaway_ended').setLabel('Giveaway Ended').setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('giveaway_count_ended').setLabel(`${g.participants.length} Entries`).setStyle(ButtonStyle.Secondary).setDisabled(true)
            );

            await message.edit({ embeds: [], flags: [MessageFlags.IsComponentsV2], components: [container, new SeparatorBuilder(), row] });
            g.ended = true; await g.save();
        } catch (e) { console.error(e); }
    }
}, 15000);

// --- DB & LOGIN ---
(async () => {
    try {
        await mongoose.connect(process.env.MONGO_TOKEN, { dbName: 'MyBotData' });
        console.log("✅ MongoDB Connected.");
        await loadFonts(); 
        await client.login(process.env.TOKEN);
    } catch (e) { console.error(e); }
})();
