const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'edit2',
    execute(message, args) {
        // Check if the user has administrator permissions
        if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            message.delete(); // Delete the command message
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
                // If the channel is not found, log the error
                console.error('Channel not found:', channelMention);
                return; // Exit the function
            }

            // Fetch the message from the specified channel
            targetChannel.messages.fetch(messageId)
                .then(msg => {
                    msg.edit(newContent, silentMessageOptions)
                        .catch(error => {
                            console.error('Error editing message:', error);
                        });
                })
                .catch(error => {
                    console.error('Error fetching message:', error);
                });
        } else {
            // If the user does not have permission, log the error
            console.error('Permission denied for user:', message.member.user.tag);
            return; // Exit the function
        }
    }
};