const fs = require('fs');
const Discord = require('discord.js');
Discord.Constants.DefaultOptions.ws.properties.$browser = "Discord Android";
const client = new Discord.Client();
const axios = require('axios');
const cron = require('node-cron');

const keep_alive = require('./keep_alive.js')

const { prefix, serverID, boosterLog, welcomeLog, roleupdateLog, roleupdateMessage, roleforLog, colourEmbed, BSVerifyRole, BSVerifyRoleupdateLog, BSVerifyRoleUpdateMessage, boosterRoleId, boosterChannelId, SuggestionChannelId, staffRole } = require("./config.json")
const config = require('./config.json');


// ---------------------------- //


// ---------------------------- //
client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
    if (command.aliases) {
        for (const alias of command.aliases) {
            client.commands.set(alias, command);
        }
    }
}
// ----------------------------  //

//client.on('ready', () => {
 //client.user.setActivity('customstatus', { 
    //type: 'CUSTOM_STATUS',
    //state: '???'
  
  //});
//});

// ------- custom status ------- //
const moment = require('moment-timezone');

client.on('ready', () => {
  console.log ('Bot is ready')
  setInterval(() => {
    const currentTime = moment().tz('Asia/Bangkok');
    const hours = currentTime.format('HH');
    const minutes = currentTime.format('mm');

  //  let emoji = '';

  //  if (minutes >= 0 && minutes < 30) {
   //   emoji = '🕐';
  //  } else {
  //    emoji = '🕜';
  //  } 

    // const thailandTime = currentTime.format(`h:mm A`);

    const thailandTime = currentTime.format(`HH:mm`);

    client.user.setActivity('customstatus', {
      type: 'CUSTOM_STATUS',
      state: `⏳ ${thailandTime} (GMT+7)`
    });
  }, 1000);
});
// ----------------------------- //




client.on('message', message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);

    if (!command) return;

    try {
        command.execute(message, args);
    } catch (error) {
        console.error(error);
        message.reply({ content: 'There was an error executing the command.', ephemeral: true, })
    }
  
});



// -------- ticket system -------- //



// ----------------------------------- //




// --------- welcomer --------- //
client.on('guildMemberAdd', async (member) => {
  if (member.user.bot) {
    return;
  }

  if (member.guild.id === serverID) {
    let memberId = member.user.id;
    let memberUserName = member.user.username;
    let memberCount = member.guild.memberCount;

    const accountCreated = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;

    // Fetch invites for the guild
    const guildInvites = await member.guild.fetchInvites();

    // Find the invite that has a use and track the inviter
    const usedInvite = guildInvites.find((invite) => invite.uses > 0 && invite.inviter);

    // Get inviter's name, invite code, and type
    const inviterName = usedInvite ? usedInvite.inviter.username : 'Unknown';
    const inviterId = usedInvite ? usedInvite.inviter.id : 'Unknown';
    const inviteCode = usedInvite ? usedInvite.code : 'Unknown';

    const embed = new Discord.MessageEmbed()
      .setTitle('Welcome to A2-Q Server')
      .setDescription(
  `-# <@${memberId}> \`(${memberUserName})\`\n-# <:calendar:1439970556534329475> Account Created: \`${accountCreated}\`\n-# <:users:1439970561953501214> Member Count: \`${memberCount}\`\n-# <:chain:1439970559105564672> Invited by <@${inviterId}> \`(${inviterName})\` using [\`${inviteCode}\`](https://discord.gg/${inviteCode}) invite`
)
      .setThumbnail(member.user.displayAvatarURL())
      .setImage('https://cdn.discordapp.com/attachments/853503167706693632/1439971676883259442/20251117_203245_0000.png')
      .setColor(colourEmbed)
     // .setFooter(`• ${member.user.username}`, member.user.displayAvatarURL()) //


    client.channels.cache.get(welcomeLog).send(embed);
  }
});
// ----------------------------- //



// ------ role update log ------ //
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
        .then(msg => msg.edit(messageContent, silentMessageOptions))
        .catch(console.error);
    } else {
      logChannel.send(messageContent, silentMessageOptions)
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



// ------ role update log ------ //

// ----------------------------- //

// ------ thank you booster ------ //

client.on('guildMemberUpdate', (oldMember, newMember) => {
    // Check if the member has boosted the server
    if (newMember.premiumSince && !oldMember.premiumSince) {
        const channel = client.channels.cache.get(boosterChannelId);
        if (channel) {
            channel.send(` <@${newMember.user.id}>, Thank you for boosting the server! 🎉`);
        } else {
            console.error('Booster channel not found!');
        }
    }
});

// ----------------------------------- //



// ------- suggestions channel ------- //

client.on('message', async message => {
       // Check if the message is from the specific channel and not from the bot itself
    if (message.channel.id === SuggestionChannelId && !message.author.bot) {
        // Delete the original message
        await message.delete();

        // Create the embed
        const embed = new Discord.MessageEmbed()
            .setColor(colourEmbed) // Set the color of the embed
            .setTitle('📥︰suggestions') // Set the title
            .setDescription(message.content) // Set the description to the original message
            .setFooter(`By: ${message.author.tag} (ID: ${message.author.id})`, message.author.displayAvatarURL()) // Set the footer with the user's mention

        // Send the embed back to the channel
        const suggestion = await message.channel.send(embed);

        // Add reactions to the embed message
        await suggestion.react('<:yee:1297271543398662265>');
await suggestion.react('<:naw:1297271574399025193>');

        message.channel.send(`-# send a message in this channel to suggest. do not send anything other than suggestions!`);
    }
});

// ----------------------------------- //


// ---- red / white colours role ---- //





client.login(process.env.TOKEN);