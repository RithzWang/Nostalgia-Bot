module.exports = {  
    name: 'edit2',  
    execute(message, args) {  
        if (message.member.permissions.has('ADMINISTRATOR')) {  
            const channelMention = args[0]; // The channel mention  
            const messageId = args[1]; // The ID of the message to edit  
            const newContent = args.slice(2).join(' '); // New content for the message  
  
            // Basic validation for required arguments  
            if (!channelMention || !messageId || !newContent) {  
                return message.channel.send({ content: 'Usage: .edit2 #channel <message_id> <new_content>' });  
            }  
  
            // Extract the channel ID from the mention  
            // Note: client.channels.cache.get() is still the correct way to get a channel by ID in v14.  
            const channelId = channelMention.replace(/<#(\d+)>/g, '$1');  
            const targetChannel = message.client.channels.cache.get(channelId);  
  
            if (!targetChannel) {  
                console.error('Channel not found:', channelMention);  
                return message.channel.send({ content: 'Error: Channel not found or invalid mention.' });  
            }  
  
            // CRITICAL: Define the edit options object  
            const editOptions = {  
                content: newContent,  
                allowedMentions: {  
                    parse: [], // Don't parse any mentions  
                },  
            };  
  
            // Fetch the message from the specified channel  
            targetChannel.messages.fetch(messageId)  
                .then(msg => {  
                    // CRITICAL CHANGE: message.edit() requires a single object  
                    msg.edit(editOptions)   
                        .then(() => {  
                            // Confirmation message updated to use V14 object syntax  
                            message.channel.send({ content: 'Message edited successfully!' });  
                        })  
                        .catch(error => {  
                            console.error('Error editing message:', error);  
                            message.channel.send({ content: 'Failed to edit message. Check bot permissions or message content.' });  
                        });  
                })  
                .catch(error => {  
                    console.error('Error fetching message:', error);  
                    message.channel.send({ content: 'Error: Could not find that message ID in the specified channel.' });  
                });  
        } else {  
            // Updated to send a polite refusal, but kept the original behavior of not sending a public message   
            // by only using console.error and return, which is safer.  
            console.error('Permission denied for user:', message.member.user.tag);  
            return; // Exit the function  
        }  
    }  
};
