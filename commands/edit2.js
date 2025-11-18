module.exports = {
    name: 'edit2',
    async execute(message, args) {
        if (!message.member.permissions.has('Administrator')) {
            console.error('Permission denied for user:', message.member.user.tag);
            return;
        }

        const channelMention = args[0]; // The channel mention
        const messageId = args[1]; // The ID of the message to edit
        const newContent = args.slice(2).join(' '); // New content for the message

        // Basic validation for required arguments
        if (!channelMention || !messageId || !newContent) {
            return message.channel.send({ content: 'Usage: .edit2 #channel <message_id> <new_content>' });
        }

        // Extract the channel ID from the mention
        const channelId = channelMention.replace(/<#(\d+)>/g, '$1');
        const targetChannel = message.client.channels.cache.get(channelId);

        if (!targetChannel) {
            console.error('Channel not found:', channelMention);
            return message.channel.send({ content: 'Error: Channel not found or invalid mention.' });
        }

        try {
            const msg = await targetChannel.messages.fetch(messageId);

            // Add this 👇 — removes embeds
            const editOptions = {
                content: newContent,
                embeds: [], // remove all embeds
                allowedMentions: { parse: [] },
            };

            await msg.edit(editOptions);

            await message.channel.send({ content: 'Message edited successfully and embeds removed!' });
        } catch (error) {
            console.error('Error editing message:', error);
            await message.channel.send({ content: 'Failed to edit message. Check bot permissions or message content.' });
        }
    },
};