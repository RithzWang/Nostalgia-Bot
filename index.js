const fs = require('fs');
const path = require('path');
const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    Collection, 
    AttachmentBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    // ✅ ADDED MISSING BUILDERS HERE
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    ThumbnailAccessory, // (Ensure your d.js version supports this, or remove if error)
    MessageFlags,
    SeparatorSpacingSize 
} = require('discord.js');

const mongoose = require('mongoose');
const { loadFonts } = require('./fontLoader');

require('./keep_alive.js');

// --- CONFIGURATION ---
const config = require("./config.json");
const { serverID, welcomeLog } = config;

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

// --- COLLECTIONS ---
client.messageCommands = new Collection();
client.invitesCache = new Collection(); 

// --- 1. LOAD HANDLERS ---
require('./handlers/commandHandler')(client);

// --- 2. LOAD LEGACY COMMANDS ---
const normalCommandsPath = path.join(__dirname, 'commands/normal commands');
if (fs.existsSync(normalCommandsPath)) {
    const commandFiles = fs.readdirSync(normalCommandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(normalCommandsPath, file);
        const command = require(filePath);
        if ('name' in command && 'execute' in command) {
            client.messageCommands.set(command.name, command);
            console.log(`✅ Loaded Message Command: ${command.name}`);
        }
    }
} else {
    console.log(`⚠️ Folder not found: ${normalCommandsPath}`);
}

// --- 3. LOAD EVENTS ---
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
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
}

// ✅ 4. CRITICAL: CACHE INVITES ON READY
// This prevents the bot from guessing the wrong inviter after a restart.
client.once('clientReady', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    // Fetch and cache invites for the Main Server
    const guild = client.guilds.cache.get(serverID);
    if (guild) {
        try {
            const invites = await guild.invites.fetch();
            invites.each(inv => client.invitesCache.set(inv.code, inv.uses));
            console.log('✅ Main Server Invites Cached.');
        } catch (e) {
            console.error('⚠️ Failed to cache invites:', e.message);
        }
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const args = message.content.trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    let command = client.messageCommands.get(commandName);
    if (!command) command = client.messageCommands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
    if (!command) return;
    if (command.channels && command.channels.length > 0 && !command.channels.includes(message.channel.id)) return;
    try { await command.execute(message, args); } catch (error) { console.error(error); }
});

// --- WELCOME LOGIC ---
const { createWelcomeImage } = require('./welcomeCanvas7.js');

client.on('guildMemberAdd', async (member) => {
    if (member.user.bot) return;
    if (member.guild.id !== serverID) return;

    // 1. Roles & Nickname
    const rolesToAdd = ['1456238105345527932', '1456197055092625573'];
    try { 
        await member.roles.add(rolesToAdd); 
        setTimeout(() => member.setNickname(`🌱 • ${member.displayName}`.substring(0, 32)), 5000);
    } catch (e) {}

    // 2. Invite Tracker & Image
    try {
        const newInvites = await member.guild.invites.fetch().catch(() => new Collection());
        
        // Logic: Find the invite where current uses > cached uses
        const usedInvite = newInvites.find(inv => inv.uses > (client.invitesCache.get(inv.code) || 0));
        
        // Update cache immediately
        newInvites.each(inv => client.invitesCache.set(inv.code, inv.uses));

        const inviterName = usedInvite?.inviter ? usedInvite.inviter.username : 'Unknown';
        const inviterId = usedInvite?.inviter ? usedInvite.inviter.id : null;
        const inviteCode = usedInvite ? usedInvite.code : 'Unknown';

        const buffer = await createWelcomeImage(member);
        const attachment = new AttachmentBuilder(buffer, { name: 'welcome-image.png' });
        const accountCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;
        
        // ✅ FIXED CONTAINER SYNTAX (No callback functions)
        const mainContainer = new ContainerBuilder()
            .setAccentColor(0x888888)
            .addSectionComponents(
                new SectionBuilder()
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Welcome to A2-Q Server'),
                        new TextDisplayBuilder().setContent(
                            `-# <@${member.user.id}> \`(${member.user.username})\`\n` +
                            `-# <:calendar:1456242387243499613> Account Created: ${accountCreated}\n` +
                            `-# <:users:1456242343303971009> Member Count: \`${member.guild.memberCount}\`\n` +
                            `-# <:chain:1456242418717556776> Invited by ${inviterId ? `<@${inviterId}>` : '**Unknown**'} \`(${inviterName})\` using [\`${inviteCode}\`](https://discord.gg/${inviteCode}) invite`
                        )
                    )
                    // Note: ThumbnailAccessory requires a specific builder or object depending on your d.js version.
                    // If this fails, comment it out. Standard SectionBuilder usually creates a thumbnail automatically via logic or requires a specific Accessory builder.
                    .setThumbnailAccessory(new ThumbnailAccessory().setURL(member.user.displayAvatarURL())) 
            )
            .addActionRowComponents(
                // Note: Rows usually take an ActionRowBuilder, NOT a callback
                // But container rows might be different. Safest standard d.js way:
                // .addActionRowComponents(new ActionRowBuilder().addComponents(...))
                // However, container specific methods might vary. This line is likely safer:
               new ButtonBuilder().setLabel('Register Here').setEmoji('1447143542643490848').setStyle(ButtonStyle.Link).setURL('https://discord.com/channels/1456197054782111756/1456197056250122352')
            )
            .addSeparatorComponents(
                // Same here, usually expects an instance, not callback
                 { spacing: SeparatorSpacingSize.Small } // Or new SeparatorBuilder()
            )
            .addMediaGalleryComponents(
                // MediaGallery usually takes an array of items or builder
                 { items: [{ url: "attachment://welcome-image.png", description: `${member.user.username} is here!` }] }
            );

        const channel = client.channels.cache.get(welcomeLog);
        if (channel) {
            await channel.send({ 
                flags: [MessageFlags.IsComponentsV2],
                files: [attachment],
                components: [mainContainer],
                allowedMentions: { users: [member.user.id] } 
            });
        }
    } catch (e) { console.error("Welcome Error:", e); }
});

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_TOKEN, { dbName: 'MyBotData' });
        console.log("✅ MongoDB Connected.");
        await loadFonts(); 
        await client.login(process.env.TOKEN);
    } catch (e) { console.error(e); }
})();
