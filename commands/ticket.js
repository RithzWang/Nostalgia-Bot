const { MessageEmbed } = require('discord.js');
const config = require('../config.json');

module.exports = {
  name: 'createticket',
  description: 'Create a new ticket channel.',
  async execute(message, args) {
    const ticketCategory = message.guild.channels.cache.get(config.ticketCategoryID);
    if (!ticketCategory || ticketCategory.type !== 'category') {
      return message.reply('The ticket category does not exist!');
    }

    const ticketName = `ticket-${message.author.username}-${Date.now()}`;
    const ticketChannel = await message.guild.channels.create(ticketName, {
      type: 'text',
      parent: ticketCategory.id,
      permissionOverwrites: [
        {
          id: message.author.id,
          allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
        },
        {
          id: config.modID[0],
          allow: ['VIEW_CHANNEL', 'SEND_MESSAGES'],
        },
      ],
    });

    const ticketEmbed = new MessageEmbed()
      .setTitle(`Ticket ${ticketName}`)
      .setDescription(`This is your ticket, ${message.author.username}! React with ❌ to close this ticket.`)
      .setColor('0x1b982e')
      .setThumbnail('https://i.imgur.com/koH8WF8.png');

    ticketChannel.send(ticketEmbed).then((sentMessage) => {
      sentMessage.react('❌'); // Add a reaction for closing the ticket
    });

    message.reply(`Your ticket has been created: ${ticketChannel}`);
  },
};