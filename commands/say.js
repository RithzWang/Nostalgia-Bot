module.exports = {
    name: 'say',
    execute(message, args) {
        if (message.member.permissions.has('ADMINISTRATOR')) {
            const content = args.join(' ');
            const silentMessageOptions = {
                allowedMentions: {
                    parse: [], // Don't parse any mentions
                },
            };
            message.delete();
            message.channel.send(content, silentMessageOptions);
        } else {
            message.channel.send('You do not have permission to use this command.');
        }
    }
};