module.exports = {
        name: 'edit',
    execute(message, args) {
        if (message.member.permissions.has('ADMINISTRATOR')) {
            message.delete()
            const messageId = args[0];
            const newContent = args.slice(1).join(' ');

            const silentMessageOptions = {
                allowedMentions: {
                    parse: [], // Don't parse any mentions
                },
            };

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
                          