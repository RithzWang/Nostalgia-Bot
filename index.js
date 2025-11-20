const fs = require('fs');
const path = require('path');
// Added REST and Routes to imports for the auto-deploy
const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ActivityType, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes } = require('discord.js');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const moment = require('moment-timezone');
const keep_alive = require('./keep_alive.js');

// ---- Configuration Imports ---- //
const { prefix, serverID, welcomeLog, roleupdateLog, roleforLog, colourEmbed } = require("./config.json");

// ------ FONT REGISTRATION ------ //
try {
    GlobalFonts.registerFromPath(path.join(__dirname, 'fontss', 'SF-Pro-Display-Bold.otf'), 'SF Pro Bold');
    GlobalFonts.registerFromPath(path.join(__dirname, 'fontss', 'NotoSans-Bold.ttf'), 'Noto Sans');
    GlobalFonts.registerFromPath(path.join(__dirname, 'fontss', 'SF Pro - Semibold.otf'), 'SF Pro');
    GlobalFonts.registerFromPath(path.join(__dirname, 'fontss', 'New York - Heavy.otf'), 'NewYork');
    GlobalFonts.registerFromPath(path.join(__dirname, 'fontss', 'NotoNaskhArabic.ttf'), 'Naskh');
    GlobalFonts.registerFromPath(path.join(__dirname, 'fontss', 'Kanit-SemiBold.ttf'), 'Kanit');
    GlobalFonts.registerFromPath(path.join(__dirname, 'fontss', 'NotoSansMath-Regular.ttf'), 'Math');
    GlobalFonts.registerFromPath(path.join(__dirname, 'fontss', 'NotoColorEmoji-Regular.ttf'), 'Emoji');
    console.log("✅ Fonts registered successfully.");
} catch (error) {
    console.error("❌ Error registering fonts. Check folder name 'fontss' and filenames.", error);
}

// --- Client Initialization --- //
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildPresences
    ],
    partials: [ Partials.Channel, Partials.Message, Partials.Reaction, Partials.GuildMember, Partials.User ],
    ws: { properties: { $browser: 'Discord iOS' } },
});

// ------ Command Loading ------ //

// 1. Prefix Commands
client.prefixCommands = new Collection();
const prefixCommandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of prefixCommandFiles) {
    const command = require(`./commands/${file}`);
    client.prefixCommands.set(command.name, command);
    if (command.aliases) {
        for (const alias of command.aliases) {
            client.prefixCommands.set(alias, command);
        }
    }
}

// 2. Slash Commands Loader
client.slashCommands = new Collection();
const slashCommandsArray = []; // We need this array for the auto-deployer
if (fs.existsSync('./slashCommands')) {
    const slashCommandFiles = fs.readdirSync('./slashCommands').filter(file => file.endsWith('.js'));
    for (const file of slashCommandFiles) {
        const command = require(`./slashCommands/${file}`);
        if (command.data && command.data.name) {
            client.slashCommands.set(command.data.name, command);
            slashCommandsArray.push(command.data.toJSON());
        }
    }
}

// --- Global Variable for Role Logging (Fixes the crash issue) ---
let lastRoleUpdateMessageId = null;
// --- Invite Cache ---
const invitesCache = new Collection();


// --------- Event Handlers ---------- //

client.on('ready', async (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}`);

    // ==============================================
    //      AUTO-DEPLOY SLASH COMMANDS START
    // ==============================================
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        console.log(`Started refreshing ${slashCommandsArray.length} application (/) commands.`);
        // Uses the bot's own ID automatically
        await rest.put(
            Routes.applicationGuildCommands(readyClient.user.id, serverID),
            { body: slashCommandsArray },
        );
        console.log('✅ Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
    }
    // ==============================================
    //       AUTO-DEPLOY SLASH COMMANDS END
    // ==============================================

    // Initialize Invites Cache
    const guild = client.guilds.cache.get(serverID);
    if(guild) {
        const currentInvites = await guild.invites.fetch().catch(() => new Collection());
        currentInvites.each(invite => invitesCache.set(invite.code, invite.uses));
    }

    // Status Loop (Fixed to 60s to avoid rate limits)
    setInterval(() => {
        const currentTime = moment().tz('Asia/Bangkok');
        const thailandTime = currentTime.format(`HH:mm`);
        readyClient.user.setActivity('customstatus', {
            type: ActivityType.Custom,
            state: `${thailandTime} (GMT+7)`
        });
    }, 60000);
});

client.on('messageCreate', message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;
    const args = message.content.slice(prefix.length).split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = client.prefixCommands.get(commandName);
    if (!command) return;
    try { command.execute(message, args); } catch (error) { console.error(error); }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.slashCommands.get(interaction.commandName);
    if (!command) return;
    try { await command.execute(interaction); } catch (error) { console.error(error); }
});

// ------- welcome message ------- //
const { createWelcomeImage } = require('./welcomeCanvas.js');

client.on('guildMemberAdd', async (member) => {
    if (member.user.bot) return;
    if (member.guild.id === serverID) {
        try {
            // Invite Tracker Logic
            const newInvites = await member.guild.invites.fetch().catch(() => new Collection());
            let usedInvite = newInvites.find(inv => inv.uses > (invitesCache.get(inv.code) || 0));
            newInvites.each(inv => invitesCache.set(inv.code, inv.uses)); // Update cache

            const inviterName = usedInvite && usedInvite.inviter ? usedInvite.inviter.username : 'Unknown';
            const inviterId = usedInvite && usedInvite.inviter ? usedInvite.inviter.id : 'Unknown';
            const inviteCode = usedInvite ? usedInvite.code : 'Unknown';

            const welcomeImageBuffer = await createWelcomeImage(member);
            const attachment = new AttachmentBuilder(welcomeImageBuffer, { name: 'welcome-image.png' });
            
            const accountCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;
            const memberCount = member.guild.memberCount;
            
            const embed = new EmbedBuilder()
                .setDescription(`### <a:wave:1440327983326822400> Welcome to A2-Q Server\n-# <@${member.user.id}> \`(${member.user.username})\`\n-# <:calendar:1439970556534329475> Account Created: ${accountCreated}\n-# <:users:1439970561953501214> Member Count: \`${memberCount}\`\n-# <:chain:1439970559105564672> Invited by <@${inviterId}> \`(${inviterName})\` using [\`${inviteCode}\`](https://discord.gg/${inviteCode}) invite`)
                .setThumbnail(member.user.displayAvatarURL())
                .setImage('attachment://welcome-image.png')
                .setColor(colourEmbed);

            const unclickableButton = new ButtonBuilder()
                .setLabel('I Hope You Enjoy Your Stay')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('‼️')
                .setCustomId('hello_button_disabled')
                .setDisabled(true);

            const row = new ActionRowBuilder().addComponents(unclickableButton);

            const channel = client.channels.cache.get(welcomeLog);
            if (channel) {
                channel.send({ embeds: [embed], files: [attachment], components: [row] });
            }
        } catch (err) {
            console.error("Error in Welcomer:", err);
        }
    }
});

// -------- role update log -------- //

client.on('guildMemberUpdate', (oldMember, newMember) => {
    if (newMember.user.bot) return;

    const specifiedRolesSet = new Set(roleforLog);
    const addedRoles = newMember.roles.cache.filter(role => specifiedRolesSet.has(role.id) && !oldMember.roles.cache.has(role.id));
    const removedRoles = oldMember.roles.cache.filter(role => specifiedRolesSet.has(role.id) && !newMember.roles.cache.has(role.id));

    const logChannel = newMember.guild.channels.cache.get(roleupdateLog);
    if (!logChannel) return;

    const silentMessageOptions = { allowedMentions: { parse: [] } };

    const editMessage = (messageContent) => {
        if (!messageContent.trim()) return;
        if (lastRoleUpdateMessageId) {
            logChannel.messages.fetch(lastRoleUpdateMessageId)
                .then(msg => msg.edit({ content: messageContent, ...silentMessageOptions }))
                .catch(e => {
                    logChannel.send({ content: messageContent, ...silentMessageOptions })
                        .then(msg => { lastRoleUpdateMessageId = msg.id; });
                });
        } else {
            logChannel.send({ content: messageContent, ...silentMessageOptions })
                .then(msg => { lastRoleUpdateMessageId = msg.id; })
                .catch(console.error);
        }
    };

    const formatRoles = (roles) => {
        const roleNames = roles.map(role => `**${role.name}**`);
        if (roleNames.length === 1) return roleNames[0];
        if (roleNames.length === 2) return `${roleNames[0]} and ${roleNames[1]}`;
        return `${roleNames.slice(0, -1).join(', ')}, and ${roleNames.slice(-1)}`;
    };

    const plural = (roles) => roles.size === 1 ? 'role' : 'roles';
    let roleUpdateMessage = '';

    if (addedRoles.size > 0 && removedRoles.size > 0) {
        roleUpdateMessage = `<a:success:1297818086463770695> ${newMember.user} has been added ${formatRoles(addedRoles)} ${plural(addedRoles)} and removed ${formatRoles(removedRoles)} ${plural(removedRoles)}!`;
    } else if (addedRoles.size > 0) {
        roleUpdateMessage = `<a:success:1297818086463770695> ${newMember.user} has been added ${formatRoles(addedRoles)} ${plural(addedRoles)}!`;
    } else if (removedRoles.size > 0) {
        roleUpdateMessage = `<a:success:1297818086463770695> ${newMember.user} has been removed ${formatRoles(removedRoles)} ${plural(removedRoles)}!`;
    }
    
    if (roleUpdateMessage) editMessage(roleUpdateMessage);
});

client.login(process.env.TOKEN);
