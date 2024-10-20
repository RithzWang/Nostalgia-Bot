module.exports = {
    name: 'send',
    execute(message, args) {
        // Check if the user has the ADMINISTRATOR permission
        if (message.member.permissions.has('ADMINISTRATOR')) {
            const channelMention = args[0]; // The channel mention
            const content = args.slice(channelMention ? 1 : 0).join(' '); // Join the arguments to form the message content
            const silentMessageOptions = {
                allowedMentions: {
                    parse: [], // Don't parse any mentions
                },
            };

            // Delete the command message
            message.delete()
                .catch(error => {
                    console.error('Error deleting command message:', error);
                    // No message sent to the channel
                });

            let targetChannel;

            // Check if a channel mention was provided
            if (channelMention) {
                // Extract the channel ID from the mention
                const channelId = channelMention.replace(/<#(\d+)>/g, '$1');
                targetChannel = message.client.channels.cache.get(channelId);

                if (!targetChannel) {
                    console.error('Channel not found:', channelMention);
                    return; // Exit the function
                }
            } else {
                // Use the current channel if no mention is provided
                targetChannel = message.channel;
            }

            // Send the message to the specified channel
            targetChannel.send(content, silentMessageOptions)
                .catch(error => {
                    console.error('Error sending message:', error);
                    // No message sent to the channel
                });
        } else {
            // If the user does not have permission, log the error and do not send a message
            console.error('Permission denied for user:', message.member.user.tag);
            return; // Exit the function
        }
    }
};