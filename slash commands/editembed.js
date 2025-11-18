const { EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');

module.exports = {
    name: 'edit-embed',
    description: 'Edits the content, color, or images of an existing embed.',
    
    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        // 1. Permission Check
        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.editReply({ content: 'You need Administrator permission to use this command.' });
        }

        // 2. Get Options
        const targetChannel = interaction.options.getChannel('channel');
        const messageId = interaction.options.getString('message_id');
        
        // Fields that might be updated
        const newTitle = interaction.options.getString('title');
        const newDescription = interaction.options.getString('description');
        const newColor = interaction.options.getString('color');
        const newFooterText = interaction.options.getString('footer');
        const newImageURL = interaction.options.getString('image');
        const newThumbnailURL = interaction.options.getString('thumbnail');
        
        // Check if at least one field is being edited
        const fieldsToEdit = [newTitle, newDescription, newColor, newFooterText, newImageURL, newThumbnailURL].filter(Boolean);
        if (fieldsToEdit.length === 0) {
            return interaction.editReply({ content: '❌ You must specify at least one option (Title, Description, Color, etc.) to edit.' });
        }
        
        // Ensure channel is valid
        if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
            return interaction.editReply({ content: '❌ The target channel is invalid or not a text channel.' });
        }

        try {
            // 3. Fetch the Target Message
            const targetMessage = await targetChannel.messages.fetch(messageId);
            
            // Safety checks
            if (targetMessage.author.id !== interaction.client.user.id) {
                return interaction.editReply({ content: '❌ I can only edit messages that I have sent.' });
            }
            if (targetMessage.embeds.length === 0) {
                return interaction.editReply({ content: '❌ The target message does not contain any embeds to edit.' });
            }
            
            // 4. Get Current Embed and Prepare Builder
            
            // Get the first (and usually only) embed object from the message
            const currentEmbed = targetMessage.embeds[0];
            
            // Create a new EmbedBuilder instance from the existing data
            const updatedEmbed = EmbedBuilder.from(currentEmbed);

            // 5. Apply Updates (Only if the option was provided)

            if (newTitle !== null) {
                updatedEmbed.setTitle(newTitle);
            }
            if (newDescription !== null) {
                updatedEmbed.setDescription(newDescription);
            }
            if (newColor !== null) {
                updatedEmbed.setColor(newColor);
            }
            
            if (newFooterText !== null) {
                updatedEmbed.setFooter({ text: newFooterText });
            }
            
            if (newImageURL !== null) {
                updatedEmbed.setImage(newImageURL);
            }
            
            if (newThumbnailURL !== null) {
                updatedEmbed.setThumbnail(newThumbnailURL);
            }
            
            // 6. Edit the Message
            await targetMessage.edit({
                // Preserve content and components (buttons)
                content: targetMessage.content,
                components: targetMessage.components,
                // Overwrite the old embed with the updated one
                embeds: [updatedEmbed],
            });

            // 7. Confirmation
            await interaction.editReply({ 
                content: `✅ Successfully edited the embed in ${targetChannel} (Message ID: \`${messageId}\`).`, 
            });

        } catch (error) {
            console.error('Error editing embed via slash command:', error);
            let errorMessage = '❌ Failed to edit embed. Check permissions or message ID.';
            if (error.code === 10008) { 
                 errorMessage = '❌ Error: Could not find that message ID in the specified channel.';
            }
            return interaction.editReply({ content: errorMessage });
        }
    }
};