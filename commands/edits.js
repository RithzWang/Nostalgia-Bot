module.exports = {
    name: 'edits',
    execute(message, args) {
        if (message.member.permissions.has('ADMINISTRATOR')) {
            message.delete(); // Delete the command message
            const channelMention = args[0]; // The channel mention
            const messageId = args[1]; // The ID of the message to edit
            const newContent = args.slice(2).join(' '); // New content for the message

            const silentMessageOptions = {
                allowedMentions: {
                    parse: [], // Don't parse any mentions
                },
            };

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

            // Fetch the message from the specified channel
            targetChannel.messages.fetch(messageId)
                .then(msg => {
                    msg.edit(newContent, silentMessageOptions)
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