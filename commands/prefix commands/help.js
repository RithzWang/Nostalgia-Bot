const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder, 
    ComponentType 
} = require('discord.js');

module.exports = {
    name: 'help',
    description: 'Shows a dynamic help menu with categories.',
    
    async execute(client, message, args) {
        // 1. Create the Embeds (Same as before)
        const generalEmbed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('🌐 General Commands')
            .setDescription('Basic commands for everyone.')
            .addFields(
                { name: '!ping', value: 'Check bot latency.' },
                { name: '!server', value: 'Get server information.' }
            );

        const modEmbed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🛡️ Moderation Commands')
            .setDescription('Tools for staff members.')
            .addFields(
                { name: '!kick', value: 'Kick a user.' },
                { name: '!ban', value: 'Ban a user.' }
            );

        const funEmbed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('🎉 Fun Commands')
            .setDescription('Relax and have fun!')
            .addFields(
                { name: '!meme', value: 'Show a random meme.' },
                { name: '!coinflip', value: 'Heads or tails?' }
            );

        const homeEmbed = new EmbedBuilder()
            .setColor('#888888')
            .setTitle('Smart A2-Q Help')
            .setDescription('Select a category from the dropdown menu below.')

        // 2. Create the Select Menu
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_select')
            .setPlaceholder('Select a category...')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('General')
                    .setEmoji('🌐')
                    .setValue('general'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Moderation')
                    .setEmoji('🛡️')
                    .setValue('moderation'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Fun')
                    .setEmoji('🎉')
                    .setValue('fun'),
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        // 3. Send the message (Using message.reply)
        // We store the sent message in a variable to attach the collector to it
        const sentMessage = await message.reply({
            embeds: [homeEmbed],
            components: [row],
        });

        // 4. Create the Collector
        // Note: We use sentMessage.createMessageComponentCollector
        const collector = sentMessage.createMessageComponentCollector({ 
            componentType: ComponentType.StringSelect, 
            time: 60000 
        });

        collector.on('collect', async i => {
            // Check if the user clicking is the original author
            // Note: message.author.id (Prefix) vs interaction.user.id (Slash)
            if (i.user.id !== message.author.id) {
                return i.reply({ content: 'These buttons aren\'t for you!', ephemeral: true });
            }

            const selection = i.values[0];

            // Even in a prefix command, the button click is an "Interaction"
            // So we still use i.update() to change the message smoothly
            if (selection === 'general') {
                await i.update({ embeds: [generalEmbed] });
            } else if (selection === 'moderation') {
                await i.update({ embeds: [modEmbed] });
            } else if (selection === 'fun') {
                await i.update({ embeds: [funEmbed] });
            }
        });

        collector.on('end', () => {
            // Edit the original message to disable the menu
            const disabledRow = new ActionRowBuilder().addComponents(
                selectMenu.setDisabled(true).setPlaceholder('Menu Expired')
            );
            // We edit 'sentMessage', not 'interaction'
            sentMessage.edit({ components: [disabledRow] }).catch(() => {});
        });
    },
};
