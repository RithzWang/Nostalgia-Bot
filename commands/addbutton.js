const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'addbutton',
    aliases: ['abtn'],
    description: 'Adds a new link button to an existing message.',
    
    async execute(message, args) {
        // 1. Permission Check
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ content: 'You need Administrator permission to use this command.', ephemeral: true });
        }

        // 2. Argument Parsing and Validation
        // Expected format: .addbutton <#channel> <messageID> <URL> | <Button Text Label>
        
        // Split the arguments into channel, message ID, and the combined URL/Label part
        const channelMention = args[0];
        const messageId = args[1];
        
        // Combine the rest of the arguments and split them by the '|' separator
        const remainingArgs = args.slice(2).join(' ').split('|').map(p => p.trim());
        const url = remainingArgs[0];
        const label = remainingArgs[1];
        
        // Initial required argument check
        if (!channelMention || !messageId || !url || !label) {
            return message.reply({ 
                content: 'Usage: `.addbutton <#channel> <message ID> <URL> | <Button Label>`',
                ephemeral: true
            });
        }
        
        // Simple URL validation
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return message.reply({ content: 'The URL must start with `http://` or `https://`.', ephemeral: true });
        }

        // 3. Channel Lookup (Using message.client.channels.cache.get is standard)
        const channelIdMatch = channelMention.match(/<#(\d+)>/);
        const channelId = channelIdMatch ? channelIdMatch[1] : channelMention;
        const targetChannel = message.client.channels.cache.get(channelId);

        if (!targetChannel || !targetChannel.isTextBased()) {
            return message.reply({ content: 'The specified channel is invalid or not a text channel.', ephemeral: true });
        }

        // 4. Fetch the Target Message
        try {
            const targetMessage = await targetChannel.messages.fetch(messageId);
            
            // Check if the bot is the author (it's best practice to only edit bot messages)
            if (targetMessage.author.id !== message.client.user.id) {
                return message.reply({ content: '❌ I can only add buttons to messages I have sent.', ephemeral: true });
            }

            // 5. Build the New Button
            const newButton = new ButtonBuilder()
                .setLabel(label)
                .setURL(url)
                .setStyle(ButtonStyle.Link);
            
            // 6. Assemble Components
            // Get existing components (action rows) and ensure we keep them
            const existingComponents = targetMessage.components;

            // Create a new action row containing only the new button
            const newRow = new ActionRowBuilder().addComponents(newButton);

            // Combine existing components with the new row
            const updatedComponents = [...existingComponents, newRow];

            // 7. Edit the Message
            await targetMessage.edit({
                // Ensure content and embeds are preserved
                content: targetMessage.content,
                embeds: targetMessage.embeds,
                // Add the updated component list
                components: updatedComponents,
            });

            // 8. Confirmation
            message.reply({ 
                content: `✅ Successfully added a new button to the message in ${targetChannel}.`, 
                ephemeral: true 
            });

            // Delete the command message for cleanliness
            message.delete().catch(() => {});

        } catch (error) {
            console.error('Error adding button:', error);
            if (error.code === 10008) { // Unknown Message
                 return message.reply({ content: '❌ Error: Could not find the message with that ID in the specified channel.', ephemeral: true });
            }
            message.reply({ content: `❌ Failed to add the button: ${error.message}`, ephemeral: true });
        }
    }
};