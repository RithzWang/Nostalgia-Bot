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
    ContainerBuilder,
    TextDisplayBuilder,
    ActionRowBuilder, 
    SeparatorBuilder, 
    MediaGalleryBuilder,        
    MediaGalleryItemBuilder,    
    MessageFlags,
    SeparatorSpacingSize 
} = require('discord.js');

const mongoose = require('mongoose');
const { loadFonts } = require('./fontLoader');

require('./keep_alive.js');

// --- CONFIGURATION ---
const config = require("./config.json");

// ✅ HARDCODED SERVER AND WELCOME CHANNEL IDs
const serverID = '1456197054782111756'; 
const welcomeLog = '1456197056250122355'; 

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
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
client.slashCommands = new Collection(); 

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

// ✅ 4. CACHE INVITES ON READY
client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

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
const { createWelcomeImage } = require('./welcomeCanvas12.js');
const { fetchAdvancedProfile } = require('./utils/v9Scraper');

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
        // Track logic remains active in background, though inviter info is no longer used in layout
        const usedInvite = newInvites.find(inv => inv.uses > (client.invitesCache.get(inv.code) || 0));
        newInvites.each(inv => client.invitesCache.set(inv.code, inv.uses));

        // ✅ FETCH NITRO PROFILE THEME COLORS HERE
        const v9Data = await fetchAdvancedProfile(member.id);
        let themeColors = null;

        if (v9Data && v9Data.user_profile?.theme_colors) {
            themeColors = v9Data.user_profile.theme_colors; 
        }

        // ✅ PASS THE COLORS INTO YOUR CANVAS
        const { welcomeImage } = await createWelcomeImage(member, themeColors);
        
        // ✅ DYNAMIC FILE NAMING
        const welcomeFileName = `${member.user.id}-welcome-image.png`;
        const files = [new AttachmentBuilder(welcomeImage, { name: welcomeFileName })];
        
        // ✅ NEW CONTAINER BUILDER MATCHING YOUR EXACT REQUEST
        const mainContainer = new ContainerBuilder()
            .setAccentColor(8947848) 
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("### السلام عليكم ورحمة الله وبركاته")
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`Welcome <@${member.user.id}> to **${member.guild.name}**\nWe hope you enjoy your stay here!`)
            )
            .addActionRowComponents(
                new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Link)
                            .setLabel("Our Tags")
                            .setEmoji({ name: "🏷️" })
                            .setURL("https://discord.com/channels/1456197054782111756/1456197056250122353"),
                        new ButtonBuilder()
                            .setStyle(ButtonStyle.Link)
                            .setLabel("Register")
                            .setEmoji({ name: "📝" })
                            .setURL("https://discord.com/channels/1456197054782111756/1456197056250122352")
                    )
            )
            .addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
            )
            .addMediaGalleryComponents(
                new MediaGalleryBuilder()
                    .addItems(
                        new MediaGalleryItemBuilder()
                            .setURL(`attachment://${welcomeFileName}`) // ✅ Dynamically linked attachment URL
                    )
            );

        const channel = client.channels.cache.get(welcomeLog);
        if (channel) {
            await channel.send({ 
                flags: [MessageFlags.IsComponentsV2],
                files: files, 
                components: [mainContainer],
                allowedMentions: { users: [member.user.id] } 
            });
        }

        // ✅ 3. Ghost ping the member in the registration channel
        const registerChannelId = '1456197056250122352';
        const registerChannel = client.channels.cache.get(registerChannelId);
        if (registerChannel) {
            registerChannel.send(`<@${member.user.id}>, don’t forget to register!`)
                .then(msg => {
                    // Delete the message immediately after sending
                    setTimeout(() => {
                        msg.delete().catch(err => console.error("Failed to delete ping message:", err));
                    }, 500); 
                })
                .catch(err => console.error("Registration Ping Error:", err));
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
