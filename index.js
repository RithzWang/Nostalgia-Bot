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

        // 2. Deploy GUILD Commands (Instant update for specific server)
        if (guildDatas.length > 0) {
            await rest.put(
                Routes.applicationGuildCommands(client.user.id, serverID),
                { body: guildDatas }
            );
            console.log('✅ Guild-only commands registered.');
        }

        // 3. Deploy GLOBAL Commands (Takes ~1 hour to update cache)
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

    setInterval(() => {
        const thailandTime = moment().tz('Asia/Bangkok').format('HH:mm');
        client.user.setPresence({
            activities: [{ name: 'customstatus', type: ActivityType.Custom, state: `⏳ ${thailandTime} (GMT+7)` }],
            status: 'dnd' 
        });
    }, 5000);
});


const { createWelcomeImage } = require('./welcomeCanvas2.js');

// --- 1. IMPORT THE IMAGE GENERATOR ---

client.on('guildMemberAdd', async (member) => {
    if (member.user.bot || member.guild.id !== serverID) return;

    // --- Roles & Nickname ---
    const rolesToAdd = ['1456238105345527932', '1456197055092625573'];
    try { 
        await member.roles.add(rolesToAdd); 
        setTimeout(() => member.setNickname(`🌱 • ${member.displayName}`.substring(0, 32)), 5000);
    } catch (e) {}

    try {
        // --- Invites & Data ---
        const newInvites = await member.guild.invites.fetch().catch(() => new Collection());
        let usedInvite = newInvites.find(inv => inv.uses > (invitesCache.get(inv.code) || 0));
        newInvites.each(inv => invitesCache.set(inv.code, inv.uses));

        const inviterName = usedInvite?.inviter ? usedInvite.inviter.username : 'Unknown';
        const inviterId = usedInvite?.inviter ? usedInvite.inviter.id : 'Unknown';
        const inviteCode = usedInvite ? usedInvite.code : 'Unknown';

        // --- Generate Image ---
        const buffer = await createWelcomeImage(member);
        const attachment = new AttachmentBuilder(buffer, { name: 'welcome-image.png' });
        const accountCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;

        // ==========================================
        //      CONTAINER BUILDER (CHAINED)
        // ==========================================
        
        const mainContainer = new ContainerBuilder()
            .setAccentColor(0x888888)
            
            // 1. Main Section (Text + Avatar)
            .addSectionComponents((section) => 
                section
                    .addTextDisplayComponents(
                        (header) => header.setContent('### Welcome to A2-Q Realm'),
                        (body) => body.setContent(
                            `-# <@${member.user.id}> \`(${member.user.username})\`\n` +
                            `-# <:calendar:1456242387243499613> Account Created: ${accountCreated}\n` +
                            `-# <:users:1456242343303971009> Member Count: \`${member.guild.memberCount}\`\n` +
                            `-# <:chain:1456242418717556776> Invited by <@${inviterId}> \`(${inviterName})\` using [\`${inviteCode}\`](https://discord.gg/${inviteCode}) invite`
                        )
                    )
                    .setThumbnailAccessory((thumb) => 
                        thumb.setURL(member.user.displayAvatarURL())
                    )
            )

            // 2. Buttons (Only Register Button)
            .addActionRowComponents((row) => 
                row.setComponents(
                    new ButtonBuilder()
                        .setLabel('Register Here')
                        .setEmoji('1447143542643490848')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://discord.com/channels/1456197054782111756/1456197056250122352')
                    // Chat Button Removed Here
                )
            )

            // 3. Separator
            .addSeparatorComponents((sep) => 
                sep.setSpacing(SeparatorSpacingSize.Small)
            )

            // 4. Media Gallery (The Welcome Image)
            .addMediaGalleryComponents((gallery) => 
                gallery.addItems((item) => 
                    item
                       // .setDescription("Welcome Image")
                        .setURL("attachment://welcome-image.png")
                )
            );

        // --- SEND MESSAGE ---
        const channel = client.channels.cache.get(welcomeLog);
        if (channel) {
            await channel.send({ 
                flags: [MessageFlags.IsComponentsV2],
                files: [attachment],
                components: [mainContainer]
            });
        }

    } catch (e) { console.error("Welcome Error:", e); }
});





// --- YOUR ORIGINAL ROLE LOGGING ---
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

// --- RESTORED GIVEAWAY END LOOP ---
setInterval(async () => {
    const endedGiveaways = await Giveaway.find({ ended: false, endTimestamp: { $lte: Date.now() } });
    for (const g of endedGiveaways) {
        try {
            const channel = client.channels.cache.get(g.channelId);
            if (!channel) continue;
            const message = await channel.messages.fetch(g.messageId).catch(() => null);
            if (!message) continue;

            let winnersText = "No valid entries.";
            if (g.participants.length > 0) {
                const winners = g.participants.sort(() => 0.5 - Math.random()).slice(0, g.winnersCount);
                winnersText = winners.map(id => `<@${id}>`).join(', ');
                await channel.send(`🎉 **CONGRATULATIONS!**\n${winnersText}, You won **${g.prize}**!`);
            }

            const endRelative = `<t:${Math.floor(g.endTimestamp / 1000)}:R>`;
            const hostInfo = `**Winner(s):** ${winnersText}\n**Host:** <@${g.hostId}>\n**Ended:** ${endRelative}`;
            
            const endedEmbed = EmbedBuilder.from(message.embeds[0])
                .setTitle(`🎉 ${g.prize}`) 
                .setColor(0x808080) 
                .setDescription(g.description ? `-# ${g.description}\n${hostInfo}` : hostInfo)
                .setFooter(null);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('ended').setLabel('Giveaway Ended').setStyle(ButtonStyle.Secondary).setDisabled(true),
                new ButtonBuilder().setCustomId('count').setLabel(`${g.participants.length} Entries`).setStyle(ButtonStyle.Secondary).setDisabled(true)
            );

            await message.edit({ embeds: [endedEmbed], components: [row] });
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
