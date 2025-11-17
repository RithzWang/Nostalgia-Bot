module.exports = {
    name: 'edit',
    execute(message, args) {
        // Permission check remains the same
        if (message.member.permissions.has('ADMINISTRATOR')) {
            message.delete().catch(console.error); // Optional: add error handling for delete

            const messageId = args[0];
            const newContent = args.slice(1).join(' ');

            if (!messageId || !newContent) {
                return message.channel.send({ content: 'Please provide a message ID and new content.' });
            }

            // message.channel.messages.fetch(messageId) remains the same

            message.channel.messages.fetch(messageId)
                .then(msg => {
                    // CRITICAL CHANGE: In v14, message.edit() requires a single object
                    // containing the 'content' and 'allowedMentions' options.
                    const editOptions = {
                        content: newContent,
                        allowedMentions: {
                            parse: [], // Don't parse any mentions
                        },
                    };
                    
                    msg.edit(editOptions) // Pass the single object
                        .catch(error => {
                            console.error('Error editing message:', error);
                            // Optional feedback for failed edit
                            message.channel.send({ content: `Failed to edit message: ${error.message}` }).catch(console.error);
                        });
                })
                .catch(error => {
                    console.error('Error fetching message:', error);
                    // Provide feedback if message fetching failed (e.g., ID is wrong or message is too old)
                    message.channel.send({ content: 'Error: Could not find or fetch the message with that ID.' }).catch(console.error);
                });
        } else {
            // Permission denial message updated to use V14 object syntax
            message.channel.send({ content: 'You do not have permission to use this command.' });
        }
    }
};