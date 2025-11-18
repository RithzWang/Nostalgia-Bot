const fs = require('fs');
const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ActivityType, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const moment = require('moment-timezone');
const keep_alive = require('./keep_alive.js');

// --- Configuration Imports ---
// REMOVED: boosterChannelId, SuggestionChannelId
const { prefix, serverID, welcomeLog, roleupdateLog, roleupdateMessage, roleforLog, colourEmbed, BSVerifyRole, BSVerifyRoleupdateLog, BSVerifyRoleUpdateMessage, staffRole } = require("./config.json");
const config = require('./config.json');

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
// ----------------------------------------------------


// ----------------------------------- //
// ---------- Canvas Image Function ---------- //
// ----------------------------------- //

async function createWelcomeImage(member) {
    const dim = {
        height: 606,
        width: 1770,
        margin: 100 
    };

    const canvas = createCanvas(dim.width, dim.height);
    const ctx = canvas.getContext('2d');

    // --- 1. Draw Blurred Avatar Background (using 'cover' effect) ---
    
    // Get a high-res avatar for the background
    const backgroundAvatarURL = member.user.displayAvatarURL({ extension: 'png', size: 1024 }); 
    const backgroundAvatar = await loadImage(backgroundAvatarURL).catch(e => {
        console.error("Error loading background avatar:", e);
        return null; // Return null if loading fails
    });

    if (backgroundAvatar) {
        // Calculate aspect ratio to emulate 'background-size: cover'
        // This ensures the image covers the entire canvas, potentially cropping edges,
        // rather than just stretching it to fit.
        const imgAspectRatio = backgroundAvatar.width / backgroundAvatar.height;
        const canvasAspectRatio = dim.width / dim.height;

        let sx, sy, sWidth, sHeight; // Source rectangle (portion of image to draw)

        if (imgAspectRatio > canvasAspectRatio) {
            // Image is wider than canvas, crop left/right
            sHeight = backgroundAvatar.height;
            sWidth = sHeight * canvasAspectRatio;
            sx = (backgroundAvatar.width - sWidth) / 2;
            sy = 0;
        } else {
            // Image is taller than canvas, crop top/bottom
            sWidth = backgroundAvatar.width;
            sHeight = sWidth / canvasAspectRatio;
            sx = 0;
            sy = (backgroundAvatar.height - sHeight) / 2;
        }

        // Draw the background avatar using the calculated source rectangle
        ctx.drawImage(backgroundAvatar, sx, sy, sWidth, sHeight, 0, 0, dim.width, dim.height);

        // Apply a blur effect
        ctx.filter = 'blur(25px)';
        ctx.drawImage(canvas, 0, 0); // Re-draw to apply filter
        ctx.filter = 'none'; // Reset filter
    } else {
        // Fallback: Solid dark background if avatar fails to load
        ctx.fillStyle = '#1e1e1e';
        ctx.fillRect(0, 0, dim.width, dim.height);
    }
    
    // 2. Add Semi-Transparent Overlay (Drawn AFTER the background and blur)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; 
    ctx.fillRect(0, 0, dim.width, dim.height);

    // --- 3. Main Avatar (Foreground) ---
    const avatarSize = 350; 
    const avatarX = dim.margin;
    const avatarY = (dim.height - avatarSize) / 2;
    const avatarRadius = avatarSize / 2;

    const mainAvatarURL = member.user.displayAvatarURL({ extension: 'png', size: 512 }); 
    const mainAvatar = await loadImage(mainAvatarURL);

    // Create a circular clip path for the main avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX + avatarRadius, avatarY + avatarRadius, avatarRadius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(mainAvatar, avatarX, avatarY, avatarSize, avatarSize);
    ctx.restore(); 


// 4. Text - Position and Styling (Scaled up)
    const textX = avatarX + avatarSize + dim.margin; 
    let currentY = dim.height / 2 - 40; 

    ctx.fillStyle = '#ffffff';

    // FIX: Remove Emojis/Special Characters from DisplayName
    // This regex removes most Discord-specific markdown and common control characters
    const cleanedDisplayName = member.displayName.replace(/<a?:\w+:\d+>|[\u200b-\u200f\uFEFF]/g, '').trim();

    // Display Name (Large, Bold)
    const displayName = cleanedDisplayName || member.user.username; // Use username as fallback if name was only emojis
    ctx.font = 'bold 100px sans-serif'; 
    ctx.fillText(displayName, textX, currentY);

    // Username (Smaller, Subdued font)
    currentY += 120; 
    
    // FIX: Remove Emojis/Special Characters from Username as well
    const cleanedUsername = member.user.username.replace(/<a?:\w+:\d+>|[\u200b-\u200f\uFEFF]/g, '').trim();
    
    const usernameText = `@${cleanedUsername}`;
    ctx.font = '50px sans-serif'; 
    ctx.fillStyle = '#b9bbbe'; 
    ctx.fillText(usernameText, textX, currentY);

// ...


// ----------------------------------- //
// ---------- Event Handlers ---------- //
// ----------------------------------- //


// A. READY EVENT AND ACTIVITY STATUS
client.on('clientReady', (readyClient) => {
    console.log('Bot is ready');
    setInterval(() => {
        const currentTime = moment().tz('Asia/Bangkok');
        const thailandTime = currentTime.format(`HH:mm`);

        readyClient.user.setActivity('customstatus', {
            type: ActivityType.Custom, 
            state: `⏳ ${thailandTime} (GMT+7)`
        });
    }, 1000);
});

// B. PREFIX COMMAND HANDLER (messageCreate)
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


// C. SLASH COMMAND HANDLER (interactionCreate)
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


// D. WELCOMER EVENT (guildMemberAdd)
client.on('guildMemberAdd', async (member) => {
    if (member.user.bot) {
        return;
    }

    if (member.guild.id === serverID) {
        let memberId = member.user.id;
        let memberUserName = member.user.username;
        let memberCount = member.guild.memberCount; 

        const accountCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;

        const guildInvites = await member.guild.invites.fetch(); 

        const usedInvite = guildInvites.find((invite) => invite.uses > 0 && invite.inviter && invite.inviter.id !== client.user.id);
        
        const inviterName = usedInvite ? usedInvite.inviter.username : 'Unknown';
        const inviterId = usedInvite ? usedInvite.inviter.id : 'Unknown';
        const inviteCode = usedInvite ? usedInvite.code : 'Unknown';


        // --- Image Generation and Attachment ---
        const welcomeImageBuffer = await createWelcomeImage(member);
        const attachment = new AttachmentBuilder(welcomeImageBuffer, { name: 'welcome-image.png' });
        const imageURL = 'attachment://welcome-image.png'; 
        // ---------------------------------------


        const embed = new EmbedBuilder()
            .setDescription(
                `### <a:wave:1440327983326822400> Welcome to A2-Q Server\n-# <@${memberId}> \`(${memberUserName})\`\n-# <:calendar:1439970556534329475> Account Created: ${accountCreated}\n-# <:users:1439970561953501214> Member Count: \`${memberCount}\`\n-# <:chain:1439970559105564672> Invited by <@${inviterId}> \`(${inviterName})\` using [\`${inviteCode}\`](https://discord.gg/${inviteCode}) invite`
            )
            .setThumbnail(member.user.displayAvatarURL())
            .setImage(imageURL)
            .setColor(colourEmbed) 

        client.channels.cache.get(welcomeLog).send({ 
            embeds: [embed],
            files: [attachment] 
        });
    }
});


// E. ROLE UPDATE LOG (guildMemberUpdate)
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


// --- Start Bot ---
client.login(process.env.TOKEN);
