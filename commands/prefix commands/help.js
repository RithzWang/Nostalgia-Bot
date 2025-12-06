const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder, 
    ComponentType,
    MessageFlags // <--- 1. ADD THIS IMPORT
} = require('discord.js');

module.exports = {
    name: 'info',
    description: 'Shows a dynamic help menu with categories.',

    async execute(message, args) {
        const client = message.client; 

        // 1. Define Embeds
        const ownerEmbed = new EmbedBuilder()
            .setColor('#888888')
            .setTitle('👑 Owner')
            .setDescription('Commands for bot owner.')
            .addFields({ name: '/in-server', value: 'Manage bot servers.' });

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
            .setTitle('🛡️ Moderation')
            .setDescription('Tools for staff members.')
            .addFields(
                { name: '/kick', value: 'Kick a user.' },
                { name: '/ban', value: 'Ban a user.' },
                { name: '/timeout', value: 'Timeout a user.' }
            );
        
        const generalEmbed = new EmbedBuilder()
            .setColor('#888888')
            .setTitle('🌐 General')
            .setDescription('Basic commands for everyone.')
            .addFields({ name: '/ping-pong', value: 'Check bot latency.' });

        const registerEmbed = new EmbedBuilder()
            .setColor('#888888')
            .setTitle('📝 Registration')
            .addFields(
                { name: '/register', value: 'Register to the server.' },
                { name: '/register-update (staff)', value: 'Update a user registration.' },
                { name: '/register-revoke (staff)', value: 'Revoke a user registration.' }
            );

        const funEmbed = new EmbedBuilder()
            .setColor('#888888')
            .setTitle('🎉 Fun')
            .setDescription('Relax and have fun!')
            .addFields({ name: '/rps', value: 'Play Rock Paper Scissors against the bot.' });

        const homeEmbed = new EmbedBuilder()
            .setColor('#888888')
               .setTitle('A2-Q Server')
    .setDescription(
        'A safe and well managed server made for fun — but taken seriously\n\n' + 
        '> We are a community for **Minecraft** builders and **Brawl Stars** brawlers. Whether you want to grind trophies, build a base, or just hang out in VC, this is a safe place for friends to game together.'
    )
    .addFields({ 
        name: 'Owner Information', 
        value: 
            '<:discord:1446794842351865958> : [Q1TN](https://discord.com/users/837741275603009626)\n' +
            '<:insta:1446793242040467486> : [32r.6](https://instagram.com/32r.6)\n' +
            '<:spotify:1446793276073181277> : [Q1TN](https://open.spotify.com/user/31ljrymawsram5zmxn4sbutp7bxm)\n' +
            '<:domain:1446793140395835583> : [ridouan.xyz](https://ridouan.xyz)'
    });

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

        // 3. Send Message (UPDATED)
        const sentMessage = await message.reply({
            embeds: [homeEmbed],
            components: [row],
            allowedMentions: { repliedUser: false },
            flags: [MessageFlags.SuppressNotifications] // <--- Makes it Silent (@silent)
        });

        // 4. Collector
        const collector = sentMessage.createMessageComponentCollector({ 
            componentType: ComponentType.StringSelect, 
            idle: 20000 
        });

        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) {
                return i.reply({ content: 'These buttons aren’t for you!', flags: MessageFlags.Ephemeral });
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
            
            sentMessage.edit({ 
                embeds: [homeEmbed], 
                components: [disabledRow] 
            }).catch(() => {});
        });
    },
};
