module.exports = {
  name: 'react',
  description: 'React to a message with emojis',
  execute(message, args) {
    let targetChannel;
    let messageId;

    if (message.mentions.channels.size > 0) {
      // If channel is mentioned, use the mentioned channel
      targetChannel = message.mentions.channels.first();
      args.shift(); // Remove the channel mention from args
    } else {
      // If no channel mention, use the current channel
      targetChannel = message.channel;
    }

    if (args.length < 2) {
      message.reply('Usage: !react [channel_mention] <message_id> <emoji1> <emoji2> ...');
      return;
    }

    messageId = args.shift();

    // Fetch the target message from the specified channel
    targetChannel.messages.fetch(messageId)
      .then((targetMessage) => {
        args.forEach((emoji) => {
          targetMessage.react(emoji);
        });
      })
      .catch((error) => {
        console.error('Error fetching message:', error);
        message.reply('Error fetching message. Make sure the provided message ID is valid.');
      });
  },
};
        
