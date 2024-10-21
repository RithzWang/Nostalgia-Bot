const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'say2',
    execute(message, args) {
        // Check if the user has administrator permissions
        if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            // Check if the first argument is a channel mention
            const channelMention = args[0];
            const targetChannel = message.mentions.channels.first() || message.guild.channels.cache.get(channelMention.replace(/<#(\d+)>/, '$1'));

            // If the channel is not found or the mention is invalid
            if (!targetChannel) {
                return message.channel.send('Please mention a valid channel.');
            }

            // Join the remaining arguments as the message content
            const content = args.slice(1).join(' ');
            
            const silentMessageOptions = {
    allowedMentions: {
        parse: ['users', 'roles', 'everyone'].map(x => ({ [x]: false })),
        repliedUser: false,
    },
};

            // Attempt to delete the original message
            message.delete().catch(err => {
                console.error('Failed to delete message:', err);
            });

            // Send the new message to the target channel
            targetChannel.send(content, silentMessageOptions)
                .then(() => {
                    // Optionally, send a confirmation message in the original channel
                    message.channel.send('Message sent successfully to ' + targetChannel.toString() + '!')
                        .catch(err => {
                            console.error('Failed to send confirmation message:', err);
                        });
                })
                .catch(err => {
                    console.error('Failed to send message:', err);
                    message.channel.send('Failed to send message to the specified channel.')
                        .catch(err => {
                            console.error('Failed to send error message:', err);
                        });
                });
        } else {
            message.channel.send('You do not have permission to use this command.')
                .catch(err => {
                    console.error('Failed to send permission denied message:', err);
                });
        }
    }
};