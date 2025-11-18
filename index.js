const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ActivityType, AttachmentBuilder } = require('discord.js');
// Using @napi-rs/canvas for better font support
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const moment = require('moment-timezone');
const keep_alive = require('./keep_alive.js');

// --- Configuration Imports ---
const { prefix, serverID, welcomeLog, roleupdateLog, roleupdateMessage, roleforLog, colourEmbed } = require("./config.json");

// ----------------------------------- //
// ---------- FONT REGISTRATION ------ //
// ----------------------------------- //
try {
    GlobalFonts.registerFromPath(path.join(__dirname, 'fontss', 'NotoSans-VariableFont.ttf'), 'Noto Sans');
    GlobalFonts.registerFromPath(path.join(__dirname, 'fontss', 'NotoNaskhArabic.ttf'), 'Naskh');
    GlobalFonts.registerFromPath(path.join(__dirname, 'fontss', 'NotoColorEmoji-Regular.ttf'), 'Emoji');
    console.log("✅ Fonts registered successfully from 'fontss' folder.");
} catch (error) {
    console.error("❌ Error registering fonts. Check folder name 'fontss' and filenames.", error);
}

// ---------------------------- //

// --- Client Initialization ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildMessageReactions 
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

// --- Command Loading ---
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
// ---------- Canvas Image Function -- //
// ----------------------------------- //

async function createWelcomeImage(member) {
    const dim = {
        height: 606,
        width: 1770,
        margin: 100 
    };

    const canvas = createCanvas(dim.width, dim.height);
    const ctx = canvas.getContext('2d');

    // --- Rounded Rectangle Clip Path ---
    const cornerRadius = 50; 
    ctx.save(); 
    ctx.beginPath();
    ctx.roundRect(0, 0, dim.width, dim.height, cornerRadius);
    ctx.closePath();
    ctx.clip(); 

    // --- 1. Draw Blurred Avatar Background ---
    const backgroundAvatarURL = member.user.displayAvatarURL({ extension: 'png', size: 1024 }); 
    const backgroundAvatar = await loadImage(backgroundAvatarURL).catch(() => null);

    if (backgroundAvatar) {
        // Simple stretch to fill for background
        ctx.drawImage(backgroundAvatar, 0, 0, dim.width, dim.height);
        
        // --- BLUR ADJUSTMENT HERE ---
        ctx.filter = 'blur(50px)'; // Increased blur from 25px to 50px
        ctx.drawImage(canvas, 0, 0); 
        ctx.filter = 'none'; 
    } else {
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, dim.width, dim.height);
    }
    
    // 2. Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; 
    ctx.fillRect(0, 0, dim.width, dim.height);

    // --- 3. Main Avatar (Foreground) ---
    const avatarSize = 400; 
    const avatarX = dim.margin + 50; 
    const avatarY = (dim.height - avatarSize) / 2;
    const avatarRadius = avatarSize / 2;

    const mainAvatarURL = member.user.displayAvatarURL({ extension: 'png', size: 512 }); 
    const mainAvatar = await loadImage(mainAvatarURL);

    ctx.save(); 
    ctx.beginPath();
    ctx.arc(avatarX + avatarRadius, avatarY + avatarRadius, avatarRadius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(mainAvatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore(); 

    // --- 4. Text ---
    const textX = avatarX + avatarSize + 60; 
    let currentY = dim.height / 2 - 50; 

    ctx.fillStyle = '#ffffff'; 

    const cleanedDisplayName = member.displayName.replace(/<a?:\w+:\d+>/g, '').trim();
    const displayName = cleanedDisplayName || member.user.username;

    ctx.font = 'bold 120px "Noto Sans", "Naskh", "Emoji"'; 
    ctx.fillText(displayName, textX, currentY);

    // Username
    currentY += 130; 
    const cleanedUsername = member.user.username.replace(/<a?:\w+:\d+>/g, '').trim();
    
    ctx.font = '80px "Noto Sans", "Naskh", "Emoji"'; 
    ctx.fillStyle = '#b9bbbe'; 
    ctx.fillText(`@${cleanedUsername}`, textX, currentY);

    ctx.restore(); 

    return canvas.toBuffer('image/png');
}


// ----------------------------------- //
// ---------- Event Handlers ---------- //
// ----------------------------------- //

client.on('clientReady', (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}`);
    setInterval(() => {
        const currentTime = moment().tz('Asia/Bangkok');
        const thailandTime = currentTime.format(`HH:mm`);
        readyClient.user.setActivity('customstatus', {
            type: ActivityType.Custom, 
            state: `⏳ ${thailandTime} (GMT+7)`
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

            const channel = client.channels.cache.get(welcomeLog);
            if (channel) channel.send({ embeds: [embed], files: [attachment] });
        } catch (err) {
            console.error("Error in Welcomer:", err);
        }
    }
});

client.on('guildMemberUpdate', (oldMember, newMember) => {
    if (newMember.user.bot) return;
    const specifiedRolesSet = new Set(roleforLog);
    const addedRoles = newMember.roles.cache.filter(role => specifiedRolesSet.has(role.id) && !oldMember.roles.cache.has(role.id));
    const removedRoles = oldMember.roles.cache.filter(role => specifiedRolesSet.has(role.id) && !newMember.roles.cache.has(role.id));

    const logChannel = newMember.guild.channels.cache.get(roleupdateLog);
    if (!logChannel) return;

    const formatRoles = (roles) => {
        const roleNames = roles.map(role => `**${role.name}**`);
        if (roleNames.length === 1) return roleNames[0];
        return `${roleNames.slice(0, -1).join(', ')}, and ${roleNames.slice(-1)}`;
    };

    let msg = '';
    if (addedRoles.size > 0 && removedRoles.size > 0) msg = `<a:success:1297818086463770695> ${newMember.user} has been added ${formatRoles(addedRoles)} and removed ${formatRoles(removedRoles)}!`;
    else if (addedRoles.size > 0) msg = `<a:success:1297818086463770695> ${newMember.user} has been added ${formatRoles(addedRoles)}!`;
    else if (removedRoles.size > 0) msg = `<a:success:1297818086463770695> ${newMember.user} has been removed ${formatRoles(removedRoles)}!`;

    if (msg) logChannel.send({ content: msg, allowedMentions: { parse: [] } }).catch(console.error);
});

client.login(process.env.TOKEN);