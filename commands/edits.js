module.exports = {
    name: 'edits',
    execute(message, args) {
        if (message.member.permissions.has('ADMINISTRATOR')) {
            message.delete();
            const channelMention = args[0]; // The channel mention
            const messageId = args[1]; // The ID of the message to edit
            const newContent = args.slice(2).join(' '); // New content for the message

            const silentMessageOptions = {
                allowedMentions: {
                    parse: [], // Don't parse any mentions
                },
            };

            // Extract the channel ID from the mention
            const channelId = channelMention.replace(/<#(\d+)>/g, '$1');
            const targetChannel = message.client.channels.cache.get(channelId);

            if (!targetChannel) {
                return message.channel.send('Channel not found.');
            }

            // Fetch the message from the specified channel
            targetChannel.messages.fetch(messageId)
                .then(msg => {
                    msg.edit(newContent, silentMessageOptions)
                       
                        .catch(error => {
                            console.error('Error editing message:', error);
                            message.channel.send('Failed to edit the message.');
                        });
                })
                .catch(error => {
                    console.error('Error fetching message:', error);
                    message.channel.send('Failed to fetch the message.');
                });
        } else {
            message.channel.send('You do not have permission to use this command.');
        }
    }
};