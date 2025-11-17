const fs = require('fs');
// CRITICAL: Update the Discord.js import to destructure required classes and enums.
const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const cron = require('node-cron');
const keep_alive = require('./keep_alive.js');
const moment = require('moment-timezone');

// The config destructuring remains the same
const { prefix, serverID, boosterLog, welcomeLog, roleupdateLog, roleupdateMessage, roleforLog, colourEmbed, BSVerifyRole, BSVerifyRoleupdateLog, BSVerifyRoleUpdateMessage, boosterRoleId, boosterChannelId, SuggestionChannelId, staffRole } = require("./config.json");
const config = require('./config.json');

// ---------------------------- //

// CRITICAL: Update Client Constructor
// 1. You must pass explicit Intents for the bot to receive events.
// 2. Partials are required for certain events (like fetching cached data).
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,           // Guild/Server events (ready, guildMemberAdd, guildMemberUpdate)
        GatewayIntentBits.GuildMessages,    // Receiving messages in channels
        GatewayIntentBits.MessageContent,   // CRITICAL for reading prefix commands (your command handler, suggestions)
        GatewayIntentBits.DirectMessages,   // For DMs if needed
        GatewayIntentBits.GuildMembers,     // Required for member events (guildMemberAdd, guildMemberUpdate, fetching members)
        GatewayIntentBits.GuildMessageReactions // If you handle reactions (e.g., in a ticket system)
    ],
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.Reaction,
        Partials.GuildMember,
        Partials.User
    ]
});

// Setting $browser property is no longer necessary or recommended in v14
// Discord.Constants.DefaultOptions.ws.properties.$browser = "Discord Android"; // REMOVED

// ---------------------------- //
// Collection import updated for v14 (imported above)
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    // V14 note: Ensure your command files export an object with `name` and `execute`
    client.commands.set(command.name, command);
    if (command.aliases) {
        for (const alias of command.aliases) {
            client.commands.set(alias, command);
        }
    }
}
// ----------------------------  //

// ------- custom status ------- //
client.on('clientReady', () => {
    console.log('Bot is ready');
    setInterval(() => {
        const currentTime = moment().tz('Asia/Bangkok');
        const thailandTime = currentTime.format(`HH:mm`);

        client.user.setActivity('customstatus', {
            type: 4, // 4 corresponds to ActivityType.Custom, which is the correct way in v14
            state: `⏳ ${thailandTime} (GMT+7)`
        });
    }, 1000);
});
// ----------------------------- //


// CRITICAL: Replace 'message' event with 'messageCreate'
client.on('messageCreate', message => {
    // Command handler logic remains mostly the same, as the 'message' object structure is similar.
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);

    if (!command) return;

    try {
        // Your command execution logic (command.execute(message, args)) should be checked for v14 changes
        command.execute(message, args);
    } catch (error) {
        console.error(error);
        // Ensure you use the v14 structure for message replies
        message.reply({ content: 'There was an error executing the command.', ephemeral: true, })
    }
});


// ----------------------------------- //


// --------- welcomer --------- //
// 'guildMemberAdd' event name remains the same
client.on('guildMemberAdd', async (member) => {
    if (member.user.bot) {
        return;
    }

    if (member.guild.id === serverID) {
        let memberId = member.user.id;
        let memberUserName = member.user.username;
        let memberCount = member.guild.memberCount; // Remains the same

        // Timestamp remains the same
        const accountCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;

        // Fetch invites for the guild (remains the same)
        const guildInvites = await member.guild.invites.fetch(); // Using .fetch() instead of deprecated property

        // Find the invite that has a use and track the inviter
        const usedInvite = guildInvites.find((invite) => invite.uses > 0 && invite.inviter && invite.inviter.id !== client.user.id);
        
        // Get inviter's name, invite code, and type
        const inviterName = usedInvite ? usedInvite.inviter.username : 'Unknown';
        const inviterId = usedInvite ? usedInvite.inviter.id : 'Unknown';
        const inviteCode = usedInvite ? usedInvite.code : 'Unknown';

        // CRITICAL: MessageEmbed is replaced by EmbedBuilder in v14
        const embed = new EmbedBuilder()
            .setTitle('Welcome to A2-Q Server')
            .setDescription(
                `-# <@${memberId}> \`(${memberUserName})\`\n-# <:calendar:1439970556534329475> Account Created: ${accountCreated}\n-# <:users:1439970561953501214> Member Count: \`${memberCount}\`\n-# <:chain:1439970559105564672> Invited by <@${inviterId}> \`(${inviterName})\` using [\`${inviteCode}\`](https://discord.gg/${inviteCode}) invite`
            )
            // CRITICAL: displayAvatarURL must be called as a method
            .setThumbnail(member.user.displayAvatarURL())
            .setImage('https://cdn.discordapp.com/attachments/853503167706693632/1439971676883259442/20251117_203245_0000.png')
            .setColor(colourEmbed) // colourEmbed should be a number or a hex string (e.g., 0xHEX, '#HEX')
        // .setFooter(`• ${member.user.username}`, member.user.displayAvatarURL()) // Footer is still valid

        // client.channels.cache.get(welcomeLog).send(embed); // v14 sends require an object
        client.channels.cache.get(welcomeLog).send({ embeds: [embed] });
    }
});
// ----------------------------- //


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
// ----------------------------- //


// ------ thank you booster ------ //

client.on('guildMemberUpdate', (oldMember, newMember) => {
    // Check if the member has boosted the server (property names remain the same)
    if (newMember.premiumSince && !oldMember.premiumSince) {
        const channel = client.channels.cache.get(boosterChannelId);
        if (channel) {
            // CRITICAL: channel.send in v14 requires an object for content/embeds/etc.
            channel.send({ content: `<@${newMember.user.id}>, Thank you for boosting the server! 🎉` });
        } else {
            console.error('Booster channel not found!');
        }
    }
});

// ----------------------------------- //


// ------- suggestions channel ------- //

// CRITICAL: Replace 'message' event with 'messageCreate'
client.on('messageCreate', async message => {
    // Check if the message is from the specific channel and not from the bot itself
    if (message.channel.id === SuggestionChannelId && !message.author.bot) {
        // Delete the original message (remains the same)
        await message.delete();

        // CRITICAL: Use EmbedBuilder for creating the embed
        const embed = new EmbedBuilder()
            .setColor(colourEmbed) // Set the color of the embed
            .setTitle('📥︰suggestions') // Set the title
            .setDescription(message.content) // Set the description to the original message
            // CRITICAL: displayAvatarURL must be called as a method
            .setFooter({ text: `By: ${message.author.tag} (ID: ${message.author.id})`, iconURL: message.author.displayAvatarURL() });

        // CRITICAL: Send the embed back to the channel using an object
        const suggestion = await message.channel.send({ embeds: [embed] });

        // Add reactions to the embed message (remains the same)
        await suggestion.react('<:yee:1297271543398662265>');
        await suggestion.react('<:naw:1297271574399025193>');

        // CRITICAL: Send a regular message using an object
        message.channel.send({ content: `-# send a message in this channel to suggest. do not send anything other than suggestions!` });
    }
});

// ----------------------------------- //


// ---- red / white colours role ---- //

client.login(process.env.TOKEN);