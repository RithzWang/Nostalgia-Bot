const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ActivityType, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const moment = require('moment-timezone');
const keep_alive = require('./keep_alive.js');

// ---- Configuration Imports ---- //

const { prefix, serverID, welcomeLog, roleupdateLog, roleupdateMessage, roleforLog, colourEmbed } = require("./config.json");

// ------ FONT REGISTRATION ------ //

try {
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

// ------------------------------- //

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
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.Reaction,
        Partials.GuildMember,
        Partials.User, 
    ], 
    ws: {
        properties: { $browser: 'Discord iOS' } 
    },
});

// ------ Command Loading ------ //

client.prefixCommands = new Collection();
client.slashCommands = new Collection(); 

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

const slashCommandFiles = fs.readdirSync('./slash commands').filter(file => file.endsWith('.js'));
for (const file of slashCommandFiles) {
    const command = require(`./slash commands/${file}`);
    client.slashCommands.set(command.name, command);
}

// ----------------------------------- //

const { createWelcomeImage } = require('./welcomeCanvas.js'); 


// --------- Event Handlers ---------- //

client.on('clientReady', (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}`);
    setInterval(() => {
        const currentTime = moment().tz('Asia/Bangkok');
        const thailandTime = currentTime.format(`HH:mm`);
        readyClient.user.setActivity('customstatus', {
            type: ActivityType.Custom, 
            state: `⏳ ${thailandTime} (GMT+7)`
        });
    }, 5000); 
});

client.on('messageCreate', message => {
    if (!message.content.startsWith(prefixed) || message.author.bot) return;
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

client.on('guildMemberAdd', async (member) => {
    if (member.user.bot) return;
    if (member.guild.id === serverID) {
        try {
            const welcomeImageBuffer = await createWelcomeImage(member);
            const attachment = new AttachmentBuilder(welcomeImageBuffer, { name: 'welcome-image.png' });
            
            const accountCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;
            const memberCount = member.guild.memberCount;
            const guildInvites = await member.guild.invites.fetch().catch(() => new Collection()); 
            const usedInvite = guildInvites.find((invite) => invite.uses > 0 && invite.inviter && invite.inviter.id !== client.user.id);
            const inviterName = usedInvite ? usedInvite.inviter.username : 'Unknown';
            const inviterId = usedInvite ? usedInvite.inviter.id : 'Unknown';
            const inviteCode = usedInvite ? usedInvite.code : 'Unknown';

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

const row = new ActionRowBuilder()
    .addComponents(unclickableButton);

            const channel = client.channels.cache.get(welcomeLog);
            if (channel) {
                channel.send({ 
                    embeds: [embed], 
                    files: [attachment],
                    components: [row] // Add the row here
                });
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

    const silentMessageOptions = {
        allowedMentions: { parse: [] },
    };

    const editMessage = (messageContent) => {
        if (!messageContent.trim()) return;
        if (roleupdateMessage) {
            logChannel.messages.fetch(roleupdateMessage)
                
                .then(msg => msg.edit({ content: messageContent, ...silentMessageOptions })) 
                .catch(console.error);
        } else {
           
            logChannel.send({ content: messageContent, ...silentMessageOptions })
                .then(msg => { roleupdateMessage = msg.id; })
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

    editMessage(roleUpdateMessage);
});



client.login(process.env.TOKEN);