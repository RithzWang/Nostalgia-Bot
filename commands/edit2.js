module.exports = {
    name: 'edit2',
    execute(message, args) {
        if (message.member.permissions.has('ADMINISTRATOR')) {
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
                // If the channel is not found, simply log the error
                console.error('Channel not found:', channelMention);
                return; // Exit the function
            }

            // Fetch the message from the specified channel
            targetChannel.messages.fetch(messageId)
                .then(msg => {
                    msg.edit(newContent, silentMessageOptions)
                .then(() => {
                    // Optionally, send a confirmation message in the original channel
                    message.channel.send('Message edited successfully!');
                })
                        .catch(error => {
                            console.error('Error editing message:', error);
                            // No message sent to the channel
                        });
                })
                .catch(error => {
                    console.error('Error fetching message:', error);
                    // No message sent to the channel
                });
        } else {
            // If the user does not have permission, do not send a message
            console.error('Permission denied for user:', message.member.user.tag);
            return; // Exit the function
        }
    }
};