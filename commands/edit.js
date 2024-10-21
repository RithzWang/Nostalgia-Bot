const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'edit',
    execute(message, args) {
        // Check if the user has administrator permissions
        if (message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            // Delete the command message
            message.delete();

            const messageId = args[0];
            const newContent = args.slice(1).join(' ');

            const silentMessageOptions = {
    allowedMentions: {
        parse: ['users', 'roles', 'everyone'].map(x => ({ [x]: false })),
        repliedUser: false,
    },
};

            // Fetch the message to edit
            message.channel.messages.fetch(messageId)
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
            message.channel.send('You do not have permission to use this command.');
        }
    }
};