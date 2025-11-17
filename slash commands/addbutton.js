const { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField, ChannelType } = require('discord.js');

module.exports = {
    name: 'addbutton',
    description: 'Adds a custom link or interaction button to an existing bot message.',
    
    async execute(interaction) {
        // Defer reply to prevent timeout
        await interaction.deferReply({ ephemeral: true });

        // 1. Permission Check
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.editReply({ content: 'You need Administrator permission to use this command.' });
        }

        // 2. Get Options
        const targetChannel = interaction.options.getChannel('channel');
        const messageId = interaction.options.getString('message_id');
        const label = interaction.options.getString('label');
        const styleName = interaction.options.getString('style');
        const url = interaction.options.getString('url');
        const customId = interaction.options.getString('custom_id');
        const isDisabled = interaction.options.getBoolean('disabled') || false; 

        // 3. Validation and Style Determination
        let buttonStyle;
        let requiresUrl = false;
        let requiresCustomId = false;

        // Map the string choice to the Discord ButtonStyle constant
        switch (styleName) {
            case 'Primary': buttonStyle = ButtonStyle.Primary; requiresCustomId = true; break;
            case 'Secondary': buttonStyle = ButtonStyle.Secondary; requiresCustomId = true; break;
            case 'Success': buttonStyle = ButtonStyle.Success; requiresCustomId = true; break;
            case 'Danger': buttonStyle = ButtonStyle.Danger; requiresCustomId = true; break;
            case 'Link': buttonStyle = ButtonStyle.Link; requiresUrl = true; break;
            default:
                return interaction.editReply({ content: '❌ Invalid button style selected.' });
        }
        
        // Final validation based on style
        if (requiresUrl && (!url || (!url.startsWith('http://') && !url.startsWith('https://')))) {
            return interaction.editReply({ content: '❌ The **Link** style requires a valid `url` (starting with `http://` or `https://`).' });
        }
        
        if (requiresCustomId && !customId) {
            return interaction.editReply({ content: '❌ This style requires a unique `custom_id` (e.g., `role_assign_1`).' });
        }
        
        // Ensure channel is valid
        if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
            return interaction.editReply({ content: '❌ The specified channel is invalid or not a text channel.' });
        }


        try {
            // 4. Fetch the Target Message
            const targetMessage = await targetChannel.messages.fetch(messageId);
            
            if (targetMessage.author.id !== interaction.client.user.id) {
                return interaction.editReply({ content: '❌ I can only add buttons to messages I have sent.' });
            }

            // 5. Build the New Button
            const newButton = new ButtonBuilder()
                .setLabel(label)
                .setStyle(buttonStyle)
                .setDisabled(isDisabled); // Apply the disabled/locked state

            if (requiresUrl) {
                newButton.setURL(url);
            } else {
                newButton.setCustomId(customId);
            }

            // 6. Assemble Components
            const existingComponents = targetMessage.components;

            if (existingComponents.length >= 5) {
                return interaction.editReply({ content: '❌ Cannot add button. The message already has the maximum of 5 component rows.' });
            }

            // Create a new action row containing only the new button
            const newRow = new ActionRowBuilder().addComponents(newButton);

            // Combine existing components with the new row
            const updatedComponents = [...existingComponents, newRow];

            // 7. Edit the Message
            await targetMessage.edit({
                content: targetMessage.content,
                embeds: targetMessage.embeds,
                components: updatedComponents,
            });

            // 8. Confirmation
            await interaction.editReply({ 
                content: `✅ Successfully added the **${label}** button (${styleName} style) to the message in ${targetChannel}.`, 
            });

        } catch (error) {
            console.error('Error adding button via slash command:', error);
             if (error.code === 10008) { 
                 return interaction.editReply({ content: '❌ Error: Could not find the message with that ID in the specified channel.' });
            }
            return interaction.editReply({ content: `❌ Failed to add button. Check bot permissions or message ID. Error: ${error.message}` });
        }
    }
};