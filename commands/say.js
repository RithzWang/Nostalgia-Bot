const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'say',
    execute(message, args) {
        // Check if the user has administrator permissions
        if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            const content = args.join(' ');
            const silentMessageOptions = {
    allowedMentions: {
        parse: ['users', 'roles', 'everyone'].map(x => ({ [x]: false })),
        repliedUser: false,
    },
};

            // Delete the command message
            message.delete();

            // Send the message with the specified content
            message.channel.send(content, silentMessageOptions)
                .catch(error => {
                    console.error('Error sending message:', error);
                });
        } else {
            // If the user does not have permission, send a message
            message.channel.send('You do not have permission to use this command.')
                .catch(error => {
                    console.error('Error sending permission denied message:', error);
                });
        }
    }
};