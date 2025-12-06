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

    async execute(message, args) {
        const client = message.client; 

        const ownerEmbed = new EmbedBuilder()
            .setColor('#888888')
            .setTitle('👑 Owner')
            .setDescription('Commands for bot owner.')
            .addFields({ name: '/in-server', value: 'Check bot latency.' });

        const adminEmbed = new EmbedBuilder() 
            .setColor('#888888')
            .setTitle('⚙️ Admin')
            .setDescription('Commands for admins.')
            .addFields(
                { name: '/embed create', value: 'Create a message embed.' },
                { name: '/embed edit', value: 'Edit an existing message embed.' },
                { name: '/say create', value: 'Create a message.' },
                { name: '/say edit', value: 'Edit an existing message.' },
                { name: '/poll', value: 'Create a poll.' },
            );

        const modEmbed = new EmbedBuilder()
            .setColor('#888888')
            .setTitle('🛡️ Moderation Commands')
            .setDescription('Tools for staff members.')
            .addFields(
                { name: '/kick', value: 'Kick a user.' },
                { name: '/ban', value: 'Ban a user.' },
                { name: '/timeout', value: 'Timeout a user.' }
            );
        
        const generalEmbed = new EmbedBuilder()
            .setColor('#888888')
            .setTitle('🌐 General Commands')
            .setDescription('Basic commands for everyone.')
            .addFields({ name: '/ping-pong', value: 'Check bot latency.' });

        const registerEmbed = new EmbedBuilder()
            .setColor('#888888')
            .setTitle('Registration')
            .addFields(
                { name: '/register', value: 'Register to the server' },
                { name: '/register-update (staff)', value: 'Update a user registration' },
                { name: '/register-revoke (staff)', value: 'Revoke a user registration' }
            );

        const funEmbed = new EmbedBuilder()
            .setColor('#888888')
            .setTitle('🎉 Fun Commands')
            .setDescription('Relax and have fun!')
            .addFields({ name: '!rps', value: 'Play Rock Paper Scissors against the bot.' });

        const homeEmbed = new EmbedBuilder()
            .setColor('#888888')
            .setTitle('Smart A2-Q Help')
            .setDescription('Select a category from the dropdown menu below.');

        // 2. Create the Select Menu
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_select')
            .setPlaceholder('Select a category...')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('Owner')
                    .setEmoji('👑')
                    .setValue('owner'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Admin')
                    .setEmoji('⚙️')
                    .setValue('admin'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Moderation')
                    .setEmoji('🛡️')
                    .setValue('moderation'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Register')
                    .setEmoji('📝')
                    .setValue('registration'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('General')
                    .setEmoji('🌐')
                    .setValue('general'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Fun')
                    .setEmoji('🎉')
                    .setValue('fun'),
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        // 3. Send Message
        const sentMessage = await message.reply({
            embeds: [homeEmbed],
            components: [row],
        });

        // 4. Collector
        const collector = sentMessage.createMessageComponentCollector({ 
            componentType: ComponentType.StringSelect, 
            time: 60000 
        });

        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) {
                return i.reply({ content: 'These buttons aren\'t for you!', ephemeral: true });
            }

            const selection = i.values[0];

            if (selection === 'owner') {
                await i.update({ embeds: [ownerEmbed] });
            } else if (selection === 'admin') {
                await i.update({ embeds: [adminEmbed] });
            } else if (selection === 'moderation') {
                await i.update({ embeds: [modEmbed] });
            } else if (selection === 'registration') {
                await i.update({ embeds: [registerEmbed] });
            } else if (selection === 'general') {
                await i.update({ embeds: [generalEmbed] });
            } else if (selection === 'fun') {
                await i.update({ embeds: [funEmbed] });  
            }
        });

        collector.on('end', () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                selectMenu.setDisabled(true).setPlaceholder('Menu Expired')
            );
            sentMessage.edit({ components: [disabledRow] }).catch(() => {});
        });
    },
};
