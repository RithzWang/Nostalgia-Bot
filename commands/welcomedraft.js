const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'welcomedraft',
    aliases: ['wm'],
    description: 'Posts the official styled welcome message with interactive buttons.',
    
    async execute(message, args) {
        // 1. Permission Check
        // Only allow staff/admins to post this important message
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply({ content: 'You need Administrator permission to post the welcome draft.', ephemeral: true });
        }

        // 2. Create the Main Embed (mimicking the style of your image)
        const welcomeEmbed = new EmbedBuilder()
            // Set Color using your configured hex color
            .setColor('#888888')
            
            // Set the title and flags (you can use custom emoji IDs here)
            .setTitle('👋 Welcome to 🇸🇦 KSA Community!') 

            // Use the image you want for the thumbnail/author icon at the top right
            .setAuthor({ 
                name: 'KSA Community Manager', 
                iconURL: 'https://cdn.discordapp.com/attachments/853503167706693632/1439971676883259442/20251117_203245_0000.png' 
            })
            
            .setDescription(
                'We are delighted to have you! Please take a moment to read our guidelines and check out the country tags.\n\n' +
                // Use a placeholder for dynamic text that would be filled in by the guildMemberAdd event
                '**Dynamic Info Placeholder:** This section is usually filled with the member count, invite tracker, and account age by the automatic `guildMemberAdd` event handler, not this static command.'
            )
            
            // Add fields to separate content blocks, if needed (can be used to push the footer down)
            .addFields(
                { name: '\u200B', value: '\u200B' } // Blank field for spacing
            )
            
            // Set a footer
            .setFooter({ text: 'Official Community Message | Last Updated: Nov 2025' });

        // 3. Create the Interactive Button Components

        // Button 1: Frequently Asked Questions (Primary/Secondary style button)
        const faqButton = new ButtonBuilder()
            .setCustomId('faq_button') // Custom ID for the bot to track clicks
            .setLabel('Frequently Asked Questions - Read Me')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('❓'); // Using an emoji

        // Button 2: Country Tags (Link style button - requires a URL)
        // Note: I'm using a placeholder URL here. Replace it with your actual country tag page/channel link.
        const tagsLinkButton = new ButtonBuilder()
            .setLabel('Country Tags - الدول')
            .setURL('https://discord.com/channels/@me/123456789/987654321') // Placeholder URL
            .setStyle(ButtonStyle.Link) // Must be Link style for a URL
            .setEmoji('🌎');
        
        // 4. Group buttons into Action Rows (max 5 buttons per row)
        // Note: For aesthetic similarity to your image, we'll put each button in its own row.

        const faqRow = new ActionRowBuilder().addComponents(faqButton);
        const tagsRow = new ActionRowBuilder().addComponents(tagsLinkButton);

        // 5. Send the Message
        try {
            await message.channel.send({
                embeds: [welcomeEmbed], // Send the main embed
                components: [faqRow, tagsRow] // Attach the rows with the buttons
            });
            
            message.delete().catch(() => {}); // Delete the command message
            
        } catch (error) {
            console.error('Error posting welcome message with components:', error);
            message.reply({ content: '❌ Failed to post the welcome message. Check bot permissions (send messages, embed links, use external emojis).', ephemeral: true });
        }
    }
};