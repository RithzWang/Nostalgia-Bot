const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'linkbutton',
    aliases: ['lbtn', 'btnlink'],
    description: 'Creates a message with a custom link button that redirects to a specified URL.',
    
    // The execute function is now async since we are fetching the channel and sending messages.
    async execute(message, args) {
        // 1. Permission Check
        // Using PermissionsBitField.Flags in v14 is the modern way
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ content: 'You need Administrator permission to use this command.', ephemeral: true });
        }

        // 2. Argument Parsing
        // Expected format: .linkbutton <URL> | <Button Text> | <#channel-optional>
        
        // Split the arguments by '|'
        const parts = args.join(' ').split('|').map(p => p.trim());
        
        const url = parts[0];
        const label = parts[1];
        let targetChannel = message.channel; // Default to the current channel
        
        // Handle optional channel mention
        if (parts.length > 2) {
            const channelMention = parts[2];
            const channelIdMatch = channelMention.match(/<#(\d+)>/);
            const channelId = channelIdMatch ? channelIdMatch[1] : channelMention;
            
            const fetchedChannel = message.guild.channels.cache.get(channelId);
            if (fetchedChannel && fetchedChannel.isTextBased()) {
                targetChannel = fetchedChannel;
            } else if (channelMention.length > 0) {
                 // If a mention was provided but invalid
                 return message.reply({ content: 'The specified channel is invalid or not a text channel.', ephemeral: true });
            }
        }

        // 3. Validation
        if (!url || !label) {
            return message.reply({ 
                content: 'Usage: `.linkbutton <URL> | <Button Text> | [#channel-optional]`',
                ephemeral: true
            });
        }
        
        // Simple URL validation (Discord only accepts http/https links for buttons)
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return message.reply({ content: 'The URL must start with `http://` or `https://`.', ephemeral: true });
        }

        // 4. Create the Button Component (v14 Syntax)
        const linkButton = new ButtonBuilder()
            .setLabel(label) // The text displayed on the button
            .setURL(url)     // The external link to open
            .setStyle(ButtonStyle.Link); // Link buttons must use ButtonStyle.Link

        // 5. Create the Action Row (v14 Syntax)
        // Buttons must be placed inside an ActionRow. A row can hold up to 5 buttons.
        const row = new ActionRowBuilder().addComponents(linkButton);

        // 6. Send the Message
        try {
            await targetChannel.send({
                content: `Click the button below to navigate to: **${label}**`,
                components: [row] // Attach the ActionRow with the button
            });
            
            // Confirm to the original user (silently)
            if (targetChannel.id !== message.channel.id) {
                message.reply({ content: `✅ Successfully posted the link button in ${targetChannel}.`, ephemeral: true });
            } else {
                // Delete the original command message if sent in the same channel
                message.delete().catch(console.error);
            }

        } catch (error) {
            console.error('Error sending message with button:', error);
            message.reply({ content: '❌ Failed to send the message with the button. Check bot permissions in the target channel.', ephemeral: true });
        }
    }
};
