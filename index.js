const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ActivityType, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const moment = require('moment-timezone');
const keep_alive = require('./keep_alive.js');

// --- Configuration Imports ---
const { prefix, serverID, welcomeLog, roleupdateLog, roleupdateMessage, roleforLog, colourEmbed } = require("./config.json");

// ----------------------------------- //
// ---------- FONT REGISTRATION ------ //
// ----------------------------------- //
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

// ---------------------------- //

// --- Client Initialization ---
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

    // --- 1. Draw Blurred Avatar Background (Fit Horizontal) ---
    const backgroundAvatarURL = member.displayAvatarURL({ extension: 'png', size: 2048 });
    const backgroundAvatar = await loadImage(backgroundAvatarURL).catch(() => null);

    if (backgroundAvatar) {
        const canvasRatio = dim.width / dim.height;
        const sWidth = backgroundAvatar.width;
        const sHeight = sWidth / canvasRatio;
        const sx = 0;
        const sy = (backgroundAvatar.height - sHeight) / 2;

        ctx.drawImage(backgroundAvatar, sx, sy, sWidth, sHeight, 0, 0, dim.width, dim.height);
        
        // Apply blur
        ctx.filter = 'blur(10px)'; 
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

    const mainAvatarURL = member.displayAvatarURL({ extension: 'png', size: 512 });
    const mainAvatar = await loadImage(mainAvatarURL);

    // A. Draw User Avatar (Clipped)
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarRadius, avatarY + avatarRadius, avatarRadius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(mainAvatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore();

    // B. Draw Status Circle
    const status = member.presence ? member.presence.status : 'offline';
    let statusColor = '#747f8d';
    switch (status) {
        case 'online': statusColor = '#3ba55c'; break;
        case 'idle':   statusColor = '#faa61a'; break;
        case 'dnd':    statusColor = '#ed4245'; break;
        case 'streaming': statusColor = '#593695'; break;
    }

    const statusRadius = 45;
    const offset = 15;
    const statusX = avatarX + avatarSize - (statusRadius * 2) + offset;
    const statusY = avatarY + avatarSize - (statusRadius * 2) + offset;

    ctx.beginPath();
    ctx.arc(statusX, statusY, statusRadius, 0, Math.PI * 2);
    ctx.fillStyle = statusColor;
    ctx.fill();
    ctx.strokeStyle = '#1e1e1e';
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.closePath();

    // C. Draw Avatar Decoration
    const decoURL = member.user.avatarDecorationURL({ extension: 'png', size: 512 });
    if (decoURL) {
        const decoImage = await loadImage(decoURL).catch(e => null);
        if (decoImage) {
            const decoScale = 1.2; 
            const scaledDecoSize = avatarSize * decoScale;
            const decoOffsetX = avatarX - (scaledDecoSize - avatarSize) / 2;
            const decoOffsetY = avatarY - (scaledDecoSize - avatarSize) / 2;
            ctx.drawImage(decoImage, decoOffsetX, decoOffsetY, scaledDecoSize, scaledDecoSize);
        }
    }

    // --- 4. Text (Server Name Top Right) ---
    // We do this before the user name to keep the code organized
    ctx.save(); 
ctx.font = 'bold 50px "Noto Sans"';
ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'; 
ctx.textAlign = 'right'; 

// 1. Change baseline to 'bottom' so coordinates anchor to the bottom of the text
ctx.textBaseline = 'bottom'; 

// 2. Change Y coordinate to (Canvas Height - Padding)
// This places the text 60px from the right and 60px from the bottom
ctx.fillText("A2-Q Server", dim.width - 60, dim.height - 60);

ctx.restore(); 



    // --- 5. User Text ---
            const textX = avatarX + avatarSize + 60;
    let currentY = dim.height / 2 - 50;

    ctx.fillStyle = '#ffffff';

    // --- START SHADOW CONFIGURATION ---
    ctx.shadowColor = "rgba(0, 0, 0, 0.75)"; // Black with 75% opacity
    ctx.shadowBlur = 15;                     // How "soft" the shadow is
    ctx.shadowOffsetX = 5;                   // Horizontal distance
    ctx.shadowOffsetY = 5;                   // Vertical distance
    // --- END SHADOW CONFIGURATION ---

    const cleanedDisplayName = member.displayName.replace(/<a?:\w+:\d+>/g, '').trim();
    const displayName = cleanedDisplayName || member.user.username;

    ctx.font = 'bold 100px "Noto Sans", "Naskh", "Kanit", "Math", "Emoji"';
    ctx.textAlign = 'left'; 
    
    ctx.fillText(displayName, textX, currentY);

    // IMPORTANT: Reset shadow after drawing text so it doesn't affect future drawings
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;


    // Username
    currentY += 130;
    const cleanedUsername = member.user.username.replace(/<a?:\w+:\d+>/g, '').trim();
    let usernameText;

    ctx.shadowColor = "rgba(0, 0, 0, 0.75)"; // Black with 75% opacity
    ctx.shadowBlur = 15;                     // How "soft" the shadow is
    ctx.shadowOffsetX = 5;                   // Horizontal distance
    ctx.shadowOffsetY = 5;

    if (member.user.discriminator && member.user.discriminator !== '0') {
        usernameText = `${cleanedUsername}#${member.user.discriminator}`;
    } else {
        usernameText = `@${cleanedUsername}`;
    }

    ctx.font = '80px "SF Pro"';
    ctx.fillStyle = '#b9bbbe';
    ctx.fillText(usernameText, textX, currentY);

      // IMPORTANT: Reset shadow after drawing text so it doesn't affect future drawings
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

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

    const unclickableButton = new ButtonBuilder()
    .setLabel('Don’t Forget To Save Your Card')
    .setStyle(ButtonStyle.Secondary) // Sets color to Gray (neutral)
    .setEmoji('‼️')
    .setCustomId('hello_button_disabled') // Required for non-link buttons
    .setDisabled(true); // This makes the button unclickable (grayed out)

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



// ------ role update log ------ //
// 'guildMemberUpdate' event name remains the same
client.on('guildMemberUpdate', (oldMember, newMember) => {
    if (newMember.user.bot) return;

    const specifiedRolesSet = new Set(roleforLog);

    // .cache access is correct here
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
                // CRITICAL: message.edit in v14 requires an object for content/embeds/etc.
                .then(msg => msg.edit({ content: messageContent, ...silentMessageOptions })) 
                .catch(console.error);
        } else {
            // CRITICAL: channel.send in v14 requires an object for content/embeds/etc.
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