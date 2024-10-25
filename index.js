const fs = require('fs');
const Discord = require('discord.js');
Discord.Constants.DefaultOptions.ws.properties.$browser = "Discord Android";
const client = new Discord.Client();
const axios = require('axios');

const keep_alive = require('./keep_alive.js')

const { prefix, serverID, boosterLog, welcomeLog, roleupdateLog, roleupdateMessage, roleforLog, colourEmbed, BSVerifyRole, BSVerifyRoleupdateLog, BSVerifyRoleUpdateMessage, boosterRoleId, boosterChannelId, SuggestionChannelId, modRole } = require("./config.json")
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
      state: `⏳ ${thailandTime} (UTC+7)`
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
        `Hey **<@${memberName}>**!\n\n<:i_:1230749121611304970> **→** <#1167046828802445353> \n<:r_:1230749926648975370> **→** <#1167394553020559420> \n<:c_:1230749152422531072> **→** <#1167046828978614347>\n<:l_:1230749184135790652> Invited by **@${inviterName}** (**${inviteCode}**)\n\nNow we have **${memberCount}** members 🎉 \n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      )
      .setColor(colourEmbed)
      .setFooter(`• ${member.user.tag}`, member.user.displayAvatarURL())


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
    roleUpdateMessage = `<a:success:1297818086463770695> **${newMember.user}** has been added **${addedRoles.map(role => `${role.name}`).join(', ')}** role(s) and removed **${removedRoles.map(role => `${role.name}`).join(', ')}** role(s) !`;
  } else if (addedRoles.size > 0) {
    roleUpdateMessage = `<a:success:1297818086463770695> **${newMember.user}** has been added **${addedRoles.map(role => `${role.name}`).join(', ')}** role(s) !`;
  } else if (removedRoles.size > 0) {
    roleUpdateMessage = `<a:success:1297818086463770695> **${newMember.user}** has been removed **${removedRoles.map(role => `${role.name}`).join(', ')}** role(s) !`;
  }

  editMessage(roleUpdateMessage);
});
// ----------------------------- //



// ------ role update log ------ //

// ----------------------------- //

// ------ thank you booster ------ //

client.on('guildMemberUpdate', (oldMember, newMember) => {
    // Check if the specific role was added
    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;

    if (!oldRoles.has(boosterRoleId) && newRoles.has(boosterRoleId)) {
        // Get the specific channel
        const channel = newMember.guild.channels.cache.get(boosterChannelId);

        if (channel) {
            // Send a message to the channel
            channel.send(`Hey, ${newMember.user.username}, thank you for supporting us!`);
        } else {
            console.log('Channel not found!');
        }
    }
});

// ----------------------------------- //



// ------- suggestions channel ------- //

const { MessageEmbed } = require('discord.js');

// Define an array of staff role IDs
const staffRoleIds = ['1247033789046067281', '1246342030758645822', '1246345136401551400', '1167046828190085170', '1168598936630599710']; // Replace with actual role IDs

client.on('message', async message => {
    // Check if the message is from the specific suggestion channel and not from the bot itself
    if (message.channel.id === SuggestionChannelId && !message.author.bot) {
        // Process suggestion...
        await message.delete();

        const embed = new MessageEmbed()
            .setColor(colourEmbed)
            .setTitle('📥︰suggestions')
            .setDescription(message.content)
            .setFooter(`By: ${message.author.tag} (ID: ${message.author.id})`, message.author.displayAvatarURL());

        const suggestion = await message.channel.send(embed);
        await suggestion.react('<:yee:1297271543398662265>');
        await suggestion.react('<:naw:1297271574399025193>');
        await message.channel.send(`-# send a message in this channel to suggest. do not send anything other than suggestions!`);
    }

    // Check if the message is a reply from a staff member
    if (message.channel.id === SuggestionChannelId && !message.author.bot && message.reference) {
        const referencedMessage = await message.channel.messages.fetch(message.reference.messageId);

        // Check if the referenced message is an embed suggestion
        if (referencedMessage.embeds.length > 0 && referencedMessage.embeds[0].title === '📥︰suggestions') {
            // Check if the user has any of the staff roles
            const hasStaffRole = message.member.roles.cache.some(role => staffRoleIds.includes(role.id));
            if (hasStaffRole) {
                // Send the reply as a new message
                const replyEmbed = new MessageEmbed()
                    .setColor('BLUE')
                    .setTitle('🗨️ Staff Reply')
                    .setDescription(message.content)
                    .setFooter(`By: ${message.author.tag}`, message.author.displayAvatarURL());

                await message.channel.send(replyEmbed);
            } else {
                // Inform the user they don't have permission
                await message.reply("You don't have permission to reply to suggestions.");
            }
        }
    }
});



client.login(process.env.TOKEN);