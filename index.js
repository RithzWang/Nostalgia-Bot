const fs = require('fs');
const Discord = require('discord.js');
Discord.Constants.DefaultOptions.ws.properties.$browser = "Discord Android";
const client = new Discord.Client();
const axios = require('axios');

const keep_alive = require('./keep_alive.js')

const { prefix, serverID, boosterLog, welcomeLog, roleupdateLog, roleupdateMessage, roleforLog, colourEmbed, auditLogChannel } = require("./config.json")
const config = require('./config.json');


// ---------------------------- //


// ---------------------------- //
client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
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

    let emoji = '';

    if (minutes >= 0 && minutes < 30) {
      emoji = '🕐';
    } else {
      emoji = '🕜';
    }

    const thailandTime = currentTime.format(`[${emoji}] h:mm A`);

    client.user.setActivity('customstatus', {
      type: 'CUSTOM_STATUS',
      state: `${thailandTime} (GMT+7)`
    });
  }, 1000); // Update every second
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




// -------- Audit Log -------- //
client.on('auditLog', (log) => {
  const guild = log.guild;
  const channel = guild.channels.cache.get(auditLogChannel);

  if (channel) {
    channel.send(`${log.reason || 'No reason provided'}`);
  }
});
// --------------------------- //


// -------- Booster Log ------- //
client.on('boost', (boostingUser) => {
  const guild = boostingUser.guild;

  const channel = guild.channels.cache.get(boosterLog);

  if (channel) {
    channel.send(` Thanks <@${boostingUser.id}>  for boosting the server! We appreciate your support.`);
  }
});
// --------------------------- //



// ---- messages edit log ----- //
client.on('messageUpdate', (oldMessage, newMessage) => {
  if (newMessage.author.bot) return;

  if (oldMessage.content !== newMessage.content) {
    newMessage.channel.send(`**Original Message:** ${oldMessage.content}`);
  }
});
// ---------------------------- //



// --------- welcomer --------- //
client.on('guildMemberAdd', async (member) => {
  if (member.user.bot) {
    return;
  }

  if (member.guild.id === serverID) {
    let memberName = member.user.id;
    let memberCount = member.guild.memberCount;

    // Fetch invites for the guild
    const guildInvites = await member.guild.fetchInvites();

    // Find the invite that has a use and track the inviter
    const usedInvite = guildInvites.find((invite) => invite.uses > 0 && invite.inviter);

    // Get inviter's name, invite code, and type
    const inviterName = usedInvite ? usedInvite.inviter.username : 'Unknown';
    const inviteCode = usedInvite ? usedInvite.code : 'Unknown';

    const embed = new Discord.MessageEmbed()
      .setTitle('━━━━━━<a:color_w:1167081298821656676><a:color_e:1167080532463587440><a:color_l:1167080793777131602><a:color_c:1167080361063358536><a:color_o:1167081021355864164><a:color_m:1167080841000796160><a:color_e:1167080532463587440>━━━━━━')
      .setDescription(
        `Hey **<@${memberName}>**, hope you enjoy your stay !\n\n<:spiderinfo:1187733532144058408> **→** <#1167046828802445353> \n<:spiderroles:1187738254775160852> **→** <#1167394553020559420> \n<:spiderchat:1187733526699855962> **→** <#1167046828978614347>\n<:spiderinvites:1187733521268224022> Invited by **@${inviterName}** (**${inviteCode}**)\n\nNow we have **${memberCount}** members 🎉 \n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      )
      .setColor(colourEmbed);

    client.channels.cache.get(welcomeLog).send(embed);
  }
});
// ----------------------------- //



// ------ role update log ------ //
client.on('guildMemberUpdate', (oldMember, newMember) => {
  if (newMember.user.bot) return;

  const specifiedRolesSet = new Set(roleforLog);

  const addedSpecifiedRoles = newMember.roles.cache.filter(role => specifiedRolesSet.has(role.id) && !oldMember.roles.cache.has(role.id));
  const removedSpecifiedRoles = oldMember.roles.cache.filter(role => specifiedRolesSet.has(role.id) && !newMember.roles.cache.has(role.id));
  const addedRoles = newMember.roles.cache.filter(role => specifiedRolesSet.has(role.id) && !oldMember.roles.cache.has(role.id));
  const removedRoles = oldMember.roles.cache.filter(role => specifiedRolesSet.has(role.id) && !newMember.roles.cache.has(role.id));

  const logChannel = newMember.guild.channels.cache.get(roleupdateLog);

  const silentMessageOptions = {
    allowedMentions: {
      parse: [], // Don't parse any mentions
    },
  };

  const editMessage = (messageContent) => {
    if (roleupdateMessage && messageContent.trim() !== '') {
      logChannel.messages.fetch(roleupdateMessage)
        .then(message => {
          message.edit(messageContent, silentMessageOptions)
            .catch(console.error);
        })
        .catch(console.error);
    } else if (messageContent.trim() !== '') {
      logChannel.send(messageContent, silentMessageOptions)
        .then(message => {
          roleupdateMessage = message.id;
        })
        .catch(console.error);
    }
  };

  let roleUpdateMessage = '';

  if (addedRoles.size > 0 && removedRoles.size > 0) {
    roleUpdateMessage = `**${newMember.user}** has been added **${addedRoles.map(role => `${role.name}`).join(', ')}** role(s) and removed **${removedRoles.map(role => `${role.name}`).join(', ')}** role(s) !`;
  } else if (addedRoles.size > 0) {
    roleUpdateMessage = `**${newMember.user}** has been added **${addedRoles.map(role => `${role.name}`).join(', ')}** role(s) !`;
  } else if (removedRoles.size > 0) {
    roleUpdateMessage = `**${newMember.user}** has been removed **${removedRoles.map(role => `${role.name}`).join(', ')}** role(s) !`;
  }

  editMessage(roleUpdateMessage);
});
// ----------------------------- //



// ---------- bs role verify -------- //
client.on('guildMemberUpdate', (oldMember, newMember) => {
  if (newMember.user.bot) return;

  const specifiedRoleID = '1230212146437165207'; // Specify the ID of the role you're interested in
  const logChannelID = '1230213741023330426'; // Specify the ID of the log channel
  const messageChannelID = '1230397328012349482'; // Specify the ID of the channel containing the recent message

  const addedRoles = newMember.roles.cache.filter(role => role.id === specifiedRoleID && !oldMember.roles.cache.has(role.id));

  if (addedRoles.size > 0) {
    const logChannel = newMember.guild.channels.cache.get(logChannelID);
    const messageChannel = newMember.guild.channels.cache.get(messageChannelID);

    if (logChannel && messageChannel) {
      messageChannel.messages.fetch({ limit: 1 }) // Fetch the recent message in the specific channel
        .then(messages => {
          const recentMessage = messages.first();

          if (recentMessage) {
            logChannel.messages.fetch({ around: roleupdateMessage, limit: 1 }) // Fetch the log message
              .then(messages => {
                const logMessage = messages.first();
                
                if (logMessage) {
                  logMessage.edit(recentMessage.content); // Edit the log message to match the recent message content
                }
              })
              .catch(console.error);
          }
        })
        .catch(console.error);
    }
  }
});
// ---------------------------------- //


client.login(process.env.TOKEN);
