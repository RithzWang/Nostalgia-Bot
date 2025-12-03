const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ActivityType, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, REST, Routes } = require('discord.js');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const moment = require('moment-timezone');
const keep_alive = require('./keep_alive.js');

// --- Import the Font Loader ---
const { loadFonts } = require('./fontLoader');

// ---- Configuration Imports ---- //
const { prefix, serverID, welcomeLog, roleupdateLog, roleforLog, colourEmbed, roleupdateMessage } = require("./config.json");

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
const slashCommandsArray = []; 
if (fs.existsSync('./slash commands')) {
    const slashCommandFiles = fs.readdirSync('./slash commands').filter(file => file.endsWith('.js'));
    for (const file of slashCommandFiles) {
        const command = require(`./slash commands/${file}`);
        if (command.data && command.data.name) {
            client.slashCommands.set(command.data.name, command);
            slashCommandsArray.push(command.data.toJSON());
        }
    }
}

// --- Global Variable for Role Logging ---
let activeRoleMessageId = null;

// --- Invite Cache ---
const invitesCache = new Collection();

// --------- Event Handlers ---------- //

// UPDATED: Used 'clientReady' as the argument name
client.on('clientReady', async (clientReady) => {
    console.log(`Logged in as ${clientReady.user.tag}`);

    //  AUTO-DEPLOY SLASH COMMANDS
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
        console.log(`Started refreshing ${slashCommandsArray.length} application (/) commands.`);
        await rest.put(
            Routes.applicationGuildCommands(clientReady.user.id, serverID),
            { body: slashCommandsArray },
        );
        console.log('✅ Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
    }

    // ---- Initialize Invites Cache ---- //
    const guild = client.guilds.cache.get(serverID);
    if(guild) {
        const currentInvites = await guild.invites.fetch().catch(() => new Collection());
        currentInvites.each(invite => invitesCache.set(invite.code, invite.uses));
    }

    // --------- Status Loop ---------- //
    setInterval(() => {
        const currentTime = moment().tz('Asia/Bangkok');
        const thailandTime = currentTime.format(`HH:mm`);
        
        // Now this works because we defined 'clientReady' above
        clientReady.user.setActivity('customstatus', {
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
        
        if (activeRoleMessageId) {
            logChannel.messages.fetch(activeRoleMessageId)
                .then(msg => msg.edit({ content: messageContent, ...silentMessageOptions })) 
                .catch((e) => {
                    console.log("Could not edit message, sending new one.");
                    logChannel.send({ content: messageContent, ...silentMessageOptions })
                        .then(msg => { activeRoleMessageId = msg.id; });
                });
        } else {
            logChannel.send({ content: messageContent, ...silentMessageOptions })
                .then(msg => { activeRoleMessageId = msg.id; })
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

    if (roleUpdateMessage) {
        editMessage(roleupdateMessage);
    }
});


// --- ASYNC STARTUP --- //
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
