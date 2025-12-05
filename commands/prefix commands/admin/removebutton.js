const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'removebutton',
    aliases: ['rbtn'],
    description: 'Removes the last Action Row (and its buttons) from an existing message.',
    
    async execute(message, args) {
        // 1. Permission Check
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ content: 'You need Administrator permission to use this command.', ephemeral: true });
        }

        // 2. Argument Parsing and Validation
        // Expected format: .removebutton <#channel> <messageID>
        
        const channelMention = args[0];
        const messageId = args[1];
        
        if (!channelMention || !messageId) {
            return message.reply({ 
                content: 'Usage: `.removebutton <#channel> <message ID>`',
                ephemeral: true
            });
        }

        // 3. Channel Lookup
        const channelIdMatch = channelMention.match(/<#(\d+)>/);
        const channelId = channelIdMatch ? channelIdMatch[1] : channelMention;
        const targetChannel = message.client.channels.cache.get(channelId);

        if (!targetChannel || !targetChannel.isTextBased()) {
            return message.reply({ content: 'The specified channel is invalid or not a text channel.', ephemeral: true });
        }

        // 4. Fetch the Target Message
        try {
            const targetMessage = await targetChannel.messages.fetch(messageId);
            
            // Check if the bot is the author
            if (targetMessage.author.id !== message.client.user.id) {
                return message.reply({ content: '❌ I can only remove buttons from messages I have sent.', ephemeral: true });
            }

            // 5. Remove the Last Action Row
            const existingComponents = targetMessage.components;

            if (existingComponents.length === 0) {
                 return message.reply({ content: 'The message already has no custom components (buttons).', ephemeral: true });
            }

            // Slice the array to exclude the last element (the last Action Row)
            const updatedComponents = existingComponents.slice(0, existingComponents.length - 1);

            // 6. Edit the Message
            await targetMessage.edit({
                // Preserve content and embeds
                content: targetMessage.content,
                embeds: targetMessage.embeds,
                // Pass the updated component list (missing the last row)
                components: updatedComponents,
            });

            // 7. Confirmation
            message.reply({ 
                content: `✅ Successfully removed the **last button row** from the message in ${targetChannel}.`, 
                ephemeral: true 
            });

            // Delete the command message for cleanliness
            message.delete().catch(() => {});

        } catch (error) {
            console.error('Error removing button:', error);
            if (error.code === 10008) { // Unknown Message
                 return message.reply({ content: '❌ Error: Could not find the message with that ID in the specified channel.', ephemeral: true });
            }
            message.reply({ content: `❌ Failed to remove the button: ${error.message}`, ephemeral: true });
        }
    }
};
