const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ActivityType, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes } = require('discord.js');
// Check if @napi-rs/canvas is actually installed, otherwise use standard 'canvas'
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas'); 
const moment = require('moment-timezone');
const keep_alive = require('./keep_alive.js');
const { loadFonts } = require('./fontLoader');

// 1. Remove 'roleupdateMessage' from here. We need it to be a variable we can change.
const { prefix, serverID, serversID, welcomeLog, roleupdateLog, roleupdateMessage, roleforLog, colourEmbed } = require("./config.json");


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

// --- COMMAND LOADING ---
client.prefixCommands = new Collection(); 
client.slashCommands = new Collection();
// Initialize this empty array just in case handler fails, though handler should fill it
client.slashDatas = []; 

require('./handlers/commandHandler')(client);

const invitesCache = new Collection();

// ==========================================
// FIX 1 & 2: Event name is 'ready', and use client.slashDatas
// ==========================================
client.on('clientReady', async (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}`);

    //  AUTO-DEPLOY SLASH COMMANDS
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        // USE client.slashDatas HERE
        console.log(`Started refreshing ${client.slashDatas.length} application (/) commands.`);
        await rest.put(
            Routes.applicationGuildCommands(readyClient.user.id, serverID),
            { body: client.slashDatas }, 
        );
        console.log('✅ Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
    }

    const guild = client.guilds.cache.get(serverID);
    if(guild) {
        const currentInvites = await guild.invites.fetch().catch(() => new Collection());
        currentInvites.each(invite => invitesCache.set(invite.code, invite.uses));
    }

    setInterval(() => {
        const currentTime = moment().tz('Asia/Bangkok');
        const thailandTime = currentTime.format(`HH:mm`);
        
       readyClient.user.setStatus('idle'); readyClient.user.setActivity('customstatus', {
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
    
    // Add alias support here if you want:
    // const command = client.prefixCommands.get(commandName) || client.prefixCommands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));

    if (!command) return;
    try { command.execute(message, args); } catch (error) { console.error(error); }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.slashCommands.get(interaction.commandName);
    if (!command) return;
    try { await command.execute(interaction); } catch (error) { console.error(error); }
});

// ==========================================
// MERGED: Welcome + Nickname (One event listener is cleaner)
// ==========================================
const { createWelcomeImage } = require('./welcomeCanvas.js');

client.on('guildMemberAdd', async (member) => {
    if (member.user.bot) return;
    if (member.guild.id !== serverID) return;

    // 1. Handle Nickname
    setTimeout(async () => {
        // Double check member is still there
        if (!member.guild.members.cache.has(member.id)) return;

        const prefixName = "🌟・";
        let newNickname = prefixName + member.displayName;
        if (newNickname.length > 32) newNickname = newNickname.substring(0, 32);

        try {
            await member.setNickname(newNickname);
            console.log(`Changed nickname for ${member.user.tag}`);
        } catch (error) {
            console.error(`Could not rename ${member.user.tag}:`, error.message);
        }
    }, 5000);

    // 2. Handle Welcome Image & Invites
    try {
        const newInvites = await member.guild.invites.fetch().catch(() => new Collection());
        let usedInvite = newInvites.find(inv => inv.uses > (invitesCache.get(inv.code) || 0));
        
        if (newInvites.size > 0) {
             newInvites.each(inv => invitesCache.set(inv.code, inv.uses));
        }

        const inviterName = usedInvite && usedInvite.inviter ? usedInvite.inviter.username : 'Unknown';
        const inviterId = usedInvite && usedInvite.inviter ? usedInvite.inviter.id : 'Unknown';
        const inviteCode = usedInvite ? usedInvite.code : 'Unknown';

        const welcomeImageBuffer = await createWelcomeImage(member);
        const attachment = new AttachmentBuilder(welcomeImageBuffer, { name: 'welcome-image.png' });
        
        const accountCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;
        const memberCount = member.guild.memberCount;
        
        const embed = new EmbedBuilder()
            .setDescription(`### Welcome to A2-Q Server\n-# <@${member.user.id}> \`(${member.user.username})\`\n-# <:calendar:1439970556534329475> Account Created: ${accountCreated}\n-# <:users:1439970561953501214> Member Count: \`${memberCount}\`\n-# <:chain:1439970559105564672> Invited by <@${inviterId}> \`(${inviterName})\` using [\`${inviteCode}\`](https://discord.gg/${inviteCode}) invite`)
            .setThumbnail(member.user.displayAvatarURL())
            .setImage('attachment://welcome-image.png')
            .setColor(colourEmbed);

        const unclickableButton = new ButtonBuilder()
            .setLabel(`${member.user.id}`)
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('1441133157855395911')
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
});

// ==========================================
// FIX 3: Role Logging logic
// ==========================================
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

(async () => {
    try {
        console.log("⏳ Starting font check...");
        await loadFonts(); 
        console.log("🚀 Fonts loaded. Logging in...");
        await client.login(process.env.TOKEN);
    } catch (error) {
        console.error("❌ Failed to start bot:", error);
    }
})();
