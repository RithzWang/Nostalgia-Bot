module.exports = {
    name: 'edits',
    execute(message, args) {
        // Check if the user has the ADMINISTRATOR permission
        if (message.member.permissions.has('ADMINISTRATOR')) {
            const channelId = args[0]; // The channel ID or mention
            const messageId = args[1]; // The message ID
            const content = args.slice(2).join(' '); // Join the arguments to form the message content

            let targetChannel;

            // Check if a channel mention was provided
            if (channelId.startsWith('<#')) {
                // Extract the channel ID from the mention
                const channelIdExtracted = channelId.replace(/<#(\d+)>/g, '$1');
                targetChannel = message.client.channels.cache.get(channelIdExtracted);

                if (!targetChannel) {
                    console.error('Channel not found:', channelId);
                    return; // Exit the function
                }
            } else {
                // Use the current channel if no mention is provided
                targetChannel = message.channel;
            }

            // Edit the message in the specified channel
            targetChannel.messages.fetch(messageId)
                .then(messageToEdit => {
                    messageToEdit.edit(content)
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
            // If the user does not have permission, log the error and do not send a message
            console.error('Permission denied for user:', message.member.user.tag);
            return; // Exit the function
        }
    }
};