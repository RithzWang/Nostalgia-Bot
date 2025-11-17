module.exports = {
    name: 'say',
    execute(message, args) {
        // v14 Note: message.member.permissions.has() remains the same.
        if (message.member.permissions.has('ADMINISTRATOR')) {
            const content = args.join(' ');
            
            // CRITICAL CHANGE: In v14, all send options (content, embeds, allowedMentions, etc.) 
            // must be bundled into a single object in the send method.
            const sendOptions = {
                content: content,
                allowedMentions: {
                    parse: [], // Don't parse any mentions
                },
            };
            
            // message.delete() remains the same
            message.delete().catch(error => {
                // Optional: Add error handling for message deletion failure
                console.error('Failed to delete message:', error);
            });
            
            // Update the send method to pass the single options object
            message.channel.send(sendOptions);

        } else {
            // This simple send without specific options is still backward-compatible, 
            // but it's best practice to use the object structure.
            message.channel.send({ content: 'You do not have permission to use this command.' });
        }
    }
};