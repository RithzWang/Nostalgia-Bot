const fs = require('fs');
// ... other imports
const { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ActivityType } = require('discord.js');
// ... other imports
const keep_alive = require('./keep_alive.js');
const moment = require('moment-timezone');

const { prefix, serverID, boosterLog, welcomeLog, roleupdateLog, roleupdateMessage, roleforLog, colourEmbed, BSVerifyRole, BSVerifyRoleupdateLog, BSVerifyRoleUpdateMessage, boosterRoleId, boosterChannelId, SuggestionChannelId, staffRole } = require("./config.json");
const config = require('./config.json');

// ---------------------------- //

const client = new Client({
    intents: [
        // Ensure ALL these lines have a comma at the end!
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.GuildMembers, // <- Ensure comma here
        GatewayIntentBits.GuildMessageReactions // <- Ensure comma here if more follow
    ], // <--- Comma separating intents and partials is NOT needed here
    partials: [
        Partials.Channel,
        Partials.Message,
        Partials.Reaction,
        Partials.GuildMember,
        Partials.User, // <- Ensure comma here
    ], // <--- This comma is necessary to separate partials and ws!
    // ----------------------------------------
    // THIS LINE MAKES THE BOT APPEAR MOBILE/ONLINE
    ws: {
        properties: { $browser: 'Discord iOS' } 
    },
    // ----------------------------------------
});

// --- 1. INITIALIZE COMMAND COLLECTIONS (Now uses the defined 'client') ---
client.prefixCommands = new Collection();
client.slashCommands = new Collection(); 

// --- 2. LOAD PREFIX COMMANDS (from ./commands) ---
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

// --- 3. LOAD SLASH COMMANDS (from ./slash commands) ---
// Note the space in the folder name requires quotes when reading the directory
const slashCommandFiles = fs.readdirSync('./slash commands').filter(file => file.endsWith('.js'));

for (const file of slashCommandFiles) {
    // We expect slash command files to be in the new directory
    const command = require(`./slash commands/${file}`);
    client.slashCommands.set(command.name, command);
}
// ----------------------------------------------------


// CRITICAL FIX: Changed 'ready' to 'clientReady'
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

// --- EXECUTION HANDLERS ---

// A. PREFIX COMMAND HANDLER (messageCreate)
client.on('messageCreate', message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Use prefixCommands collection
    const command = client.prefixCommands.get(commandName);

    if (!command) return;

    try {
        command.execute(message, args);
    } catch (error) {
        console.error(error);
        message.reply({ content: 'There was an error executing the command.', ephemeral: true, })
    }
});


// B. SLASH COMMAND HANDLER (interactionCreate) - NEW!
client.on('interactionCreate', async interaction => {
    // Only handle chat input (slash) commands
    if (!interaction.isChatInputCommand()) return;

    // Use slashCommands collection
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
           // .setTitle('Welcome to A2-Q Server')
            .setDescription(
                `### <a:wave:1440327983326822400> Welcome to A2-Q Server\n-# <@${memberId}> \`(${memberUserName})\`\n-# <:calendar:1439970556534329475> Account Created: ${accountCreated}\n-# <:users:1439970561953501214> Member Count: \`${memberCount}\`\n-# <:chain:1439970559105564672> Invited by <@${inviterId}> \`(${inviterName})\` using [\`${inviteCode}\`](https://discord.gg/${inviteCode}) invite`
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