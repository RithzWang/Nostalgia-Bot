const fs = require('fs');
const path = require('path'); // Import path for safe file loading
const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ActivityType, AttachmentBuilder } = require('discord.js');
// ✅ FIX: Added registerFont to imports
const { createCanvas, loadImage, registerFont } = require('canvas');
const moment = require('moment-timezone');
const keep_alive = require('./keep_alive.js');

// --- Configuration Imports ---
const { prefix, serverID, welcomeLog, roleupdateLog, roleupdateMessage, roleforLog, colourEmbed } = require("./config.json");
// Note: You can access config.token if needed, or use process.env.TOKEN

// ----------------------------------- //
// ---------- FONT REGISTRATION ------ //
// ----------------------------------- //
// ✅ FIX: Register the fonts before the bot starts
// Ensure you have a folder named 'fonts' with these exact file names
try {
    registerFont(path.join(__dirname, 'fontss', 'AmiriQuran-Regular.ttf'), { family: 'Amiri' });
    registerFont(path.join(__dirname, 'fontss', 'NotoColorEmoji-Regular.ttf'), { family: 'Emoji' });
    console.log("✅ Fonts registered successfully.");
} catch (error) {
    console.error("❌ Error registering fonts. Check your 'fonts' folder path.", error);
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

// --- Command and File Loading ---
client.prefixCommands = new Collection();
client.slashCommands = new Collection(); 

// Load Prefix Commands
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

// Load Slash Commands
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
    const imageWidth = dim.width;
    const imageHeight = dim.height;

    ctx.save(); 
    ctx.beginPath();
    ctx.moveTo(cornerRadius, 0);
    ctx.lineTo(imageWidth - cornerRadius, 0);
    ctx.quadraticCurveTo(imageWidth, 0, imageWidth, cornerRadius);
    ctx.lineTo(imageWidth, imageHeight - cornerRadius);
    ctx.quadraticCurveTo(imageWidth, imageHeight, imageWidth - cornerRadius, imageHeight);
    ctx.lineTo(cornerRadius, imageHeight);
    ctx.quadraticCurveTo(0, imageHeight, 0, imageHeight - cornerRadius);
    ctx.lineTo(0, cornerRadius);
    ctx.quadraticCurveTo(0, 0, cornerRadius, 0);
    ctx.closePath();
    ctx.clip(); 

    // --- 1. Draw Blurred Avatar Background ---
    const backgroundAvatarURL = member.user.displayAvatarURL({ extension: 'png', size: 1024 }); 
    const backgroundAvatar = await loadImage(backgroundAvatarURL).catch(e => {
        console.error("Error loading background avatar:", e);
        return null; 
    });

    if (backgroundAvatar) {
        const imgAspectRatio = backgroundAvatar.width / backgroundAvatar.height;
        const canvasAspectRatio = dim.width / dim.height;

        let sx, sy, sWidth, sHeight; 

        if (imgAspectRatio > canvasAspectRatio) {
            sHeight = backgroundAvatar.height;
            sWidth = sHeight * canvasAspectRatio;
            sx = (backgroundAvatar.width - sWidth) / 2;
            sy = 0;
        } else {
            sWidth = backgroundAvatar.width;
            sHeight = sWidth / canvasAspectRatio;
            sx = 0;
            sy = (backgroundAvatar.height - sHeight) / 2;
        }

        ctx.drawImage(backgroundAvatar, sx, sy, sWidth, sHeight, 0, 0, dim.width, dim.height);

        ctx.filter = 'blur(25px)';
        ctx.drawImage(canvas, 0, 0); 
        ctx.filter = 'none'; 
    } else {
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, dim.width, dim.height);
    }
    
    // 2. Add Semi-Transparent Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'; 
    ctx.fillRect(0, 0, dim.width, dim.height);

    // --- 3. Main Avatar (Foreground) ---
    const avatarSize = 400; 
    const avatarX = dim.margin + 50; 
    const avatarY = (dim.height - avatarSize) / 2;
    const avatarRadius = avatarSize / 2;

    const mainAvatarURL = member.user.displayAvatarURL({ extension: 'png', size: 512 }); 
    const mainAvatar = await loadImage(mainAvatarURL);

    // Circular clip path
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

    // ✅ FIX: Only remove Discord custom emojis (<:name:id>), keep Unicode emojis (🥺)
    const cleanedDisplayName = member.displayName.replace(/<a?:\w+:\d+>/g, '').trim();
    const displayName = cleanedDisplayName || member.user.username;

    // ✅ FIX: Define the font Fallback Stack
    // 1. "sans-serif" (Standard English)
    // 2. "Amiri" (Your Arabic Font)
    // 3. "Emoji" (Your Emoji Font)
    ctx.font = 'bold 120px sans-serif, "Amiri", "Emoji"'; 
    ctx.fillText(displayName, textX, currentY);

    // Username
    currentY += 130; 
    const cleanedUsername = member.user.username.replace(/<a?:\w+:\d+>/g, '').trim();
    const usernameText = `@${cleanedUsername}`;
    
    ctx.font = '80px sans-serif, "Amiri", "Emoji"'; 
    ctx.fillStyle = '#b9bbbe'; 
    ctx.fillText(usernameText, textX, currentY);

    ctx.restore(); 

    return canvas.toBuffer('image/png');
}


// ----------------------------------- //
// ---------- Event Handlers ---------- //
// ----------------------------------- //

// A. READY EVENT
client.on('ready', (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}`);
    setInterval(() => {
        const currentTime = moment().tz('Asia/Bangkok');
        const thailandTime = currentTime.format(`HH:mm`);

        readyClient.user.setActivity('customstatus', {
            type: ActivityType.Custom, 
            state: `⏳ ${thailandTime} (GMT+7)`
        });
    }, 60000); // Changed to 60000 (1 minute) to avoid rate limits, 1 second is too fast for status updates
});

// B. PREFIX COMMAND HANDLER
client.on('messageCreate', message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.prefixCommands.get(commandName);

    if (!command) return;

    try {
        command.execute(message, args);
    } catch (error) {
        console.error(error);
        message.reply({ content: 'There was an error executing the command.', ephemeral: true, })
    }
});


// C. SLASH COMMAND HANDLER
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.slashCommands.get(interaction.commandName);

    if (!command) {
        console.error(`No slash command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
        } else {
            await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
    }
});


// D. WELCOMER EVENT
client.on('guildMemberAdd', async (member) => {
    if (member.user.bot) return;

    if (member.guild.id === serverID) {
        let memberId = member.user.id;
        let memberUserName = member.user.username;
        let memberCount = member.guild.memberCount; 

        const accountCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;

        // Fetch invites to see who invited
        const guildInvites = await member.guild.invites.fetch().catch(() => new Collection()); 
        const usedInvite = guildInvites.find((invite) => invite.uses > 0 && invite.inviter && invite.inviter.id !== client.user.id);
        
        const inviterName = usedInvite ? usedInvite.inviter.username : 'Unknown';
        const inviterId = usedInvite ? usedInvite.inviter.id : 'Unknown';
        const inviteCode = usedInvite ? usedInvite.code : 'Unknown';

        // --- Image Generation ---
        const welcomeImageBuffer = await createWelcomeImage(member);
        const attachment = new AttachmentBuilder(welcomeImageBuffer, { name: 'welcome-image.png' });
        
        const embed = new EmbedBuilder()
            .setDescription(
                `### <a:wave:1440327983326822400> Welcome to A2-Q Server\n-# <@${memberId}> \`(${memberUserName})\`\n-# <:calendar:1439970556534329475> Account Created: ${accountCreated}\n-# <:users:1439970561953501214> Member Count: \`${memberCount}\`\n-# <:chain:1439970559105564672> Invited by <@${inviterId}> \`(${inviterName})\` using [\`${inviteCode}\`](https://discord.gg/${inviteCode}) invite`
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setImage('attachment://welcome-image.png')
            .setColor(colourEmbed) 

        const channel = client.channels.cache.get(welcomeLog);
        if (channel) {
            channel.send({ 
                embeds: [embed],
                files: [attachment] 
            });
        } else {
            console.log("Welcome Channel ID not found or invalid.");
        }
    }
});


// E. ROLE UPDATE LOG
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
        // Note: 'roleupdateMessage' is a const import from config, so we can't update it in this file permanently.
        // Logic handles sending a new message if one doesn't exist in this session.
        logChannel.send({ content: messageContent, ...silentMessageOptions }).catch(console.error);
    };

    const formatRoles = (roles) => {
        const roleNames = roles.map(role => `**${role.name}**`);
        if (roleNames.length === 1) return roleNames[0];
        if (roleNames.length === 2) return `${roleNames[0]} and ${roleNames[1]}`;
        return `${roleNames.slice(0, -1).join(', ')}, and ${roleNames.slice(-1)}`;
    };

    const plural = (roles) => roles.size === 1 ? 'role' : 'roles';
    let roleUpdateMessageStr = '';

    if (addedRoles.size > 0 && removedRoles.size > 0) {
        roleUpdateMessageStr = `<a:success:1297818086463770695> ${newMember.user} has been added ${formatRoles(addedRoles)} ${plural(addedRoles)} and removed ${formatRoles(removedRoles)} ${plural(removedRoles)}!`;
    } else if (addedRoles.size > 0) {
        roleUpdateMessageStr = `<a:success:1297818086463770695> ${newMember.user} has been added ${formatRoles(addedRoles)} ${plural(addedRoles)}!`;
    } else if (removedRoles.size > 0) {
        roleUpdateMessageStr = `<a:success:1297818086463770695> ${newMember.user} has been removed ${formatRoles(removedRoles)} ${plural(removedRoles)}!`;
    }

    editMessage(roleUpdateMessageStr);
});


// --- Start Bot ---
client.login(process.env.TOKEN);
