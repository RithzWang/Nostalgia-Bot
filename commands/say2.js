module.exports = {
    name: 'say2',
    execute(message, args) {
        // Check if the user has administrator permissions (remains the same)
        if (message.member.permissions.has('ADMINISTRATOR')) {
            // Check if the first argument is a channel mention
            const channelMention = args[0];
            
            // Channel lookup logic:
            // message.mentions.channels.first() is still valid.
            // message.guild.channels.cache.get() is still valid.
            const targetChannel = message.mentions.channels.first() || message.guild.channels.cache.get(channelMention ? channelMention.replace(/<#(\d+)>/, '$1') : null);

            // If the channel is not found or the mention is invalid
            if (!targetChannel) {
                return message.channel.send({ content: 'Please mention a valid channel.' }); // V14 object syntax
            }

            // Join the remaining arguments as the message content
            const content = args.slice(1).join(' ');

            // If there's no content to send
            if (!content) {
                return message.channel.send({ content: 'Please provide content for the message.' });
            }

            // CRITICAL CHANGE: Combine content and allowedMentions into a single object.
            const sendOptions = {
                content: content,
                allowedMentions: {
                    parse: [], // Don't parse any mentions
                },
            };


            // Send the new message to the target channel
            // V14 REQUIRES sending the single options object
            targetChannel.send(sendOptions)
                .then(() => {
                    // Confirmation message also updated to use V14 object syntax
                    message.channel.send({ content: 'Message sent successfully to ' + targetChannel.toString() + '!' });
                })
                .catch(err => {
                    console.error('Failed to send message:', err);
                    message.channel.send({ content: 'Failed to send message to the specified channel.' });
                });
        } else {
            // Permission denial message updated to use V14 object syntax
            message.channel.send({ content: 'You do not have permission to use this command.' });
        }
    }
};