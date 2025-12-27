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
    MessageFlags // Needed for Silent messages
} = require('discord.js');

// Database Library
const mongoose = require('mongoose');

const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas'); 
const moment = require('moment-timezone');
const keep_alive = require('./keep_alive.js');
const { loadFonts } = require('./fontLoader');

// --- CONFIGURATION ---
// 1. Load the config
const config = require("./config.json");
const Sticky = require('./src/models/Sticky');


// 2. Extract constants (WE DO NOT extract roleupdateMessageID here)
const { prefix, serverID, serversID, welcomeLog, roleupdateLog, roleforLog, colourEmbed } = config;

// 3. Define the variable separately as 'let' so we can change it
// If it's in config, we load it, otherwise it starts as null
let roleupdateMessageID = config.roleupdateMessageID || null;


const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessagePolls
    ],
    partials: [ Partials.Channel, Partials.Message, Partials.Reaction, Partials.GuildMember, Partials.User ],
    ws: {
        properties: {
            browser: 'Discord iOS'
        }
    }
});

// --- COMMAND LOADING ---
client.prefixCommands = new Collection(); 
client.slashCommands = new Collection();
client.slashDatas = []; 

require('./handlers/commandHandler')(client);

const invitesCache = new Collection();

// --- EVENTS ---
client.on('clientReady', async (readyClient) => {
    console.log(`Logged in as ${readyClient.user.tag}`);

    // AUTO-DEPLOY SLASH COMMANDS
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
    try {
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
        const thailandTime = currentTime.format('HH:mm');

        readyClient.user.setPresence({
            activities: [{
                name: 'customstatus',
                type: ActivityType.Custom,
                state: `⏳ ${thailandTime} (GMT+7)`
            }],
            status: 'idle' 
        });
    }, 5000);
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

// --- WELCOMER ---
const { createWelcomeImage } = require('./welcomeCanvas.js');

client.on('guildMemberAdd', async (member) => {
    if (member.user.bot) return;
    if (member.guild.id !== serverID) return;

    // 1. Handle Nickname
    setTimeout(async () => {
        if (!member.guild.members.cache.has(member.id)) return;
        const prefixName = "🌱・";
        let newNickname = prefixName + member.displayName;
        if (newNickname.length > 32) newNickname = newNickname.substring(0, 32);
        try { await member.setNickname(newNickname); } catch (e) {}
    }, 5000);

    // 2. Handle Welcome Logic
    try {
        const newInvites = await member.guild.invites.fetch().catch(() => new Collection());
        let usedInvite = newInvites.find(inv => inv.uses > (invitesCache.get(inv.code) || 0));
        if (newInvites.size > 0) newInvites.each(inv => invitesCache.set(inv.code, inv.uses));

        const inviterName = usedInvite && usedInvite.inviter ? usedInvite.inviter.username : 'Unknown';
        const inviterId = usedInvite && usedInvite.inviter ? usedInvite.inviter.id : 'Unknown';
        const inviteCode = usedInvite ? usedInvite.code : 'Unknown';
        
        // (Note: The button now links to your website, but we still calculate invite data for the text)

        const welcomeImageBuffer = await createWelcomeImage(member);
        const attachment = new AttachmentBuilder(welcomeImageBuffer, { name: 'welcome-image.png' });
        
        const accountCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;
        const memberCount = member.guild.memberCount;
        const hexColor = parseInt(colourEmbed.replace('#', ''), 16);

        const v2Payload = {
            flags: 1 << 15,
            components: [
                // --- PART 1: The Text Box ---
                {
                    type: 1,
                    components: [{
                        type: 6, // Container
                        accent_color: hexColor,
                        components: [
                            {
                                type: 7, // Header Section
                                content: [
                                    { type: 8, content: "### Welcome to A2-Q Server" },
                                    { type: 8, content: `-# <@${member.user.id}> \`(${member.user.username})\`` }
                                ],
                                accessory: { 
                                    type: 2, style: 2, thumbnail: { url: member.user.displayAvatarURL() } 
                                }
                            },
                            {
                                type: 7, // Stats Section
                                content: [
                                    { type: 8, content: `-# <:calendar:1439970556534329475> Account Created: ${accountCreated}` },
                                    { type: 8, content: `-# <:users:1439970561953501214> Member Count: \`${memberCount}\`` },
                                    { type: 8, content: `-# <:chain:1439970559105564672> Invited by <@${inviterId}> \`(${inviterName})\`` }
                                ]
                            }
                        ]
                    }]
                },
                
                // --- PART 2: The Website Button (In the middle) ---
                {
                    type: 1, // Action Row
                    components: [{
                        type: 2, // Button
                        style: 5, // Link Style
                        label: `Visit Website`, // You can change this label if you want
                        url: 'https://ridouan.xyz/' // LINK UPDATED HERE
                    }]
                },

                // --- PART 3: The Image Box ---
                {
                    type: 1,
                    components: [{
                        type: 6, // Container
                        accent_color: hexColor,
                        components: [{
                            type: 7,
                            content: [], // No text
                            accessory: {
                                type: 3, // Media Accessory (The Image)
                                src: "attachment://welcome-image.png",
                                width: 0, 
                                height: 0 
                            }
                        }]
                    }]
                },

                // --- PART 4: The Old ID Button (At the bottom) ---
                {
                    type: 1,
                    components: [{
                        type: 2,
                        style: 2, // Secondary
                        label: `${member.user.id}`,
                        emoji: { id: '1441133157855395911' },
                        custom_id: 'hello_button_disabled',
                        disabled: true
                    }]
                }
            ]
        };

        const channel = client.channels.cache.get(welcomeLog);
        if (channel) {
            channel.send({ ...v2Payload, files: [attachment] });
        }

    } catch (err) {
        console.error("Error in Welcomer:", err);
    }
});


// --- ROLE LOGGING (YOUR ORIGINAL LOGIC) ---
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
        
        // Use the variable we defined at the top
        if (roleupdateMessageID) {
            logChannel.messages.fetch(roleupdateMessageID)
                .then(msg => msg.edit({ content: messageContent, ...silentMessageOptions })) 
                .catch(console.error);
        } else {
            logChannel.send({ content: messageContent, ...silentMessageOptions })
                .then(msg => { roleupdateMessageID = msg.id; }) // Only possible because it's a 'let' now
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
        roleUpdateMessage = `<:yes:1297814648417943565> ${newMember.user} has been added ${formatRoles(addedRoles)} ${plural(addedRoles)} and removed ${formatRoles(removedRoles)} ${plural(removedRoles)}!`;
    } else if (addedRoles.size > 0) {
        roleUpdateMessage = `<:yes:1297814648417943565> ${newMember.user} has been added ${formatRoles(addedRoles)} ${plural(addedRoles)}!`;
    } else if (removedRoles.size > 0) {
        roleUpdateMessage = `<:yes:1297814648417943565> ${newMember.user} has been removed ${formatRoles(removedRoles)} ${plural(removedRoles)}!`;
    }

    editMessage(roleUpdateMessage);
});

// --- INITIALIZATION ---
// --- STICKY MESSAGE LOGIC ---
// 1. Create a variable outside the event listener to hold the timers
const stickyTimers = new Map();

client.on('messageCreate', async (message) => {
    // Ignore bots
    if (message.author.bot) return;

    // 2. If a timer is already running for this channel, STOP it.
    // This prevents the bot from spamming if people are typing fast.
    if (stickyTimers.has(message.channel.id)) {
        clearTimeout(stickyTimers.get(message.channel.id));
    }

    // 3. Start a new timer for 5 seconds (5000ms)
    const timer = setTimeout(async () => {
        try {
            const stickyConfig = await Sticky.findOne({ channelId: message.channel.id });
            
            if (!stickyConfig) return; 

            // Delete the previous message
            if (stickyConfig.lastMessageId) {
                const lastMessage = await message.channel.messages.fetch(stickyConfig.lastMessageId).catch(() => null);
                if (lastMessage) {
                    await lastMessage.delete().catch(() => {});
                }
            }

            // Create and Send Embed
            const stickyEmbed = new EmbedBuilder()
                .setTitle('Pinned Message')
                .setDescription(stickyConfig.content)
                .setColor('#888888');

            const sentMessage = await message.channel.send({ embeds: [stickyEmbed] });

            // Save the new message ID
            stickyConfig.lastMessageId = sentMessage.id;
            await stickyConfig.save();

            // Remove the channel from the timer map as we are done
            stickyTimers.delete(message.channel.id);

        } catch (err) {
            console.error("Error handling sticky message:", err);
        }
    }, 5000); // Wait 5 seconds

    // Save the timer so we can cancel it if someone types again
    stickyTimers.set(message.channel.id, timer);
});




// --- BUTTON ROLE CLICK HANDLER ---
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith('role_')) {
        
        // Split ID: role_123456789_1  ->  ['role', '123456789', '1']
        const parts = interaction.customId.split('_');
        const roleId = parts[1];
        const mode = parts[2] || '0'; // Default to '0' (Toggle) if missing (for old buttons)

        const role = interaction.guild.roles.cache.get(roleId);

        if (!role) {
            return interaction.reply({ content: '<:no:1297814819105144862> This role no longer exists.', flags: MessageFlags.Ephemeral });
        }

        if (role.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.reply({ content: '<:no:1297814819105144862> I cannot assign this role because it is higher than me.', flags: MessageFlags.Ephemeral });
        }

        const member = interaction.member;
        const hasRole = member.roles.cache.has(roleId);

        // MODE 1: VERIFY ONLY (True)
        if (mode === '1') {
            if (hasRole) {
                return interaction.reply({ 
                    content: `<:no:1297814819105144862> You are already verified with the **${role.name}** role.`, 
                    flags: MessageFlags.Ephemeral 
                });
            } else {
                await member.roles.add(role);
                return interaction.reply({ 
                    content: `<:yes:1297814648417943565> You have been added **${role.name}**.`, 
                    flags: MessageFlags.Ephemeral 
                });
            }
        } 
        
        // MODE 0: TOGGLE (False)
        else {
            if (hasRole) {
                await member.roles.remove(role);
                return interaction.reply({ 
                    content: `<:yes:1297814648417943565> Removed **${role.name}** role.`, 
                    flags: MessageFlags.Ephemeral 
                });
            } else {
                await member.roles.add(role);
                return interaction.reply({ 
                    content: `<:yes:1297814648417943565> Added **${role.name}** role.`, 
                    flags: MessageFlags.Ephemeral 
                });
            }
        }
    }
});




(async () => {
    try {
        // Connect to Database (Render Safe)
        if (process.env.MONGO_TOKEN) {
            // We use the variable name 'MyBotData' for your DB folder
            await mongoose.connect(process.env.MONGO_TOKEN, { dbName: 'MyBotData' });
            console.log("✅ Connected to MongoDB!");
        } else {
            console.log("⚠️ No MONGO_TOKEN found. Database features will not work.");
        }

        console.log("⏳ Starting font check...");
        await loadFonts(); 
        console.log("🚀 Fonts loaded. Logging in...");
        await client.login(process.env.TOKEN);
    } catch (error) {
        console.error("❌ Failed to start bot:", error);
    }
})();
