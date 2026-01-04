const { 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder, 
    ComponentType, 
    MessageFlags,
    // V2 Imports
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('Shows a dynamic help menu'),

    async execute(interaction) {
        // 1. Create the Select Menu (Shared across all views)
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('help_select')
            .setPlaceholder('Select a category...')
            .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('Home').setEmoji('🏠').setValue('home'),
                new StringSelectMenuOptionBuilder().setLabel('Bot Owner').setEmoji('1447143417711951872').setValue('owner'),
                new StringSelectMenuOptionBuilder().setLabel('Admin').setEmoji('1447144258342490122').setValue('admin'),
                new StringSelectMenuOptionBuilder().setLabel('Moderation').setEmoji('1447143480559140895').setValue('moderation'),
                new StringSelectMenuOptionBuilder().setLabel('Registration').setEmoji('1447143542643490848').setValue('registration'),
                new StringSelectMenuOptionBuilder().setLabel('General').setEmoji('1447143679348441098').setValue('general'),
                new StringSelectMenuOptionBuilder().setLabel('Fun').setEmoji('1447143741008904324').setValue('fun'),
            );

        const menuRow = new ActionRowBuilder().addComponents(selectMenu);

        // --- HELPER: Function to build a Category Container ---
        function createInfoContainer(title, description, fields = []) {
            const container = new ContainerBuilder().setAccentColor(0x888888);

            // Title
            container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${title}`));
            
            // Description (if exists)
            if (description) {
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(description));
            }

            // Divider
            container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

            // Commands List (Formatted like Embed Fields)
            if (fields.length > 0) {
                const fieldText = fields.map(f => `**${f.name}**\n${f.value}`).join('\n\n');
                container.addTextDisplayComponents(new TextDisplayBuilder().setContent(fieldText));
                container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));
            }

            // Add Menu INSIDE the container
            container.addActionRowComponents(menuRow);
            
            return container;
        }

        // 2. Define Content Data
        const pages = {
            home: {
                title: 'A2-Q Server',
                desc: 'A safe and well managed server made for fun — but taken seriously\n\n> We are a small community for **Minecraft** builders and **Brawl Stars** brawlers. Whether you want to grind trophies, build a base, or just hang out in VC, this is a safe place for friends to game together.\n\n**Owner Information\n<:discord:1446794842351865958> : [**Q1TN**](https://discord.com/users/837741275603009626)\n<:insta:1446793242040467486> : [**32r.6**](https://instagram.com/32r.6)\n<:spotify:1446793276073181277> : [**Q1TN**](https://open.spotify.com/user/31ljrymawsram5zmxn4sbutp7bxm)\n<:domain:1446793140395835583> : [**ridouan.xyz**](https://ridouan.xyz)}
                
            },
            owner: {
                title: '<:owner:1447143417711951872> Bot Owner',
                desc: 'Commands for bot owner.',
                fields: [
                    { name: '/in-server', value: 'Manage bot servers.' },
                    { name: '/deletedm', value: 'Delete messages in one’s DM.' }
                ]
            },
            admin: {
                title: '<:admin:1447144258342490122> Admin',
                desc: 'Commands for admins.',
                fields: [
                    { name: '/embed create', value: 'Create a message embed.' },
                    { name: '/embed edit', value: 'Edit an existing message embed.' },
                    { name: '/message send', value: 'Create a message.' },
                    { name: '/poll', value: 'Create a poll.' },
                    { name: '/sticky set', value: 'Set a sticky message.' }
                ]
            },
            moderation: {
                title: '<:moderation:1447143480559140895> Moderation',
                desc: 'Tools for staff members.',
                fields: [
                    { name: '/kick', value: 'Kick a member.' },
                    { name: '/ban', value: 'Ban a member.' },
                    { name: '/timeout', value: 'Timeout a member.' },
                    { name: '/warn', value: 'Warn a member.' }
                ]
            },
            registration: {
                title: '<:registration:1447143542643490848> Registration',
                desc: 'Join the server systems.',
                fields: [
                    { name: '/register', value: 'Register yourself to the server.' }
                ]
            },
            general: {
                title: '<:general:1447143679348441098> General',
                desc: 'Basic commands for everyone.',
                fields: [
                    { name: '/ping-pong', value: 'Check bot latency.' }
                ]
            },
            fun: {
                title: '<:fun:1447143741008904324> Fun',
                desc: 'Relax and have fun!',
                fields: [
                    { name: '/rps', value: 'Play Rock Paper Scissors.' }
                ]
            }
        };

        // 3. Send Initial Message (Home)
        const initialData = pages.home;
        const homeContainer = createInfoContainer(initialData.title, initialData.desc, initialData.fields);

        const response = await interaction.reply({
            components: [homeContainer], // Container is the ONLY root component
            flags: [MessageFlags.SuppressNotifications, MessageFlags.IsComponentsV2],
            fetchReply: true
        });

        // 4. Collector Logic
        const collector = response.createMessageComponentCollector({ 
            componentType: ComponentType.StringSelect, 
            time: 60000 
        });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: 'These buttons aren’t for you!', flags: MessageFlags.Ephemeral });
            }

            const selection = i.values[0];
            const data = pages[selection] || pages.home;

            // Build new container based on selection
            const newContainer = createInfoContainer(data.title, data.desc, data.fields);

            await i.update({ components: [newContainer] });
        });

        collector.on('end', () => {
            // Disable the menu inside the container
            const disabledMenu = StringSelectMenuBuilder.from(selectMenu)
                .setDisabled(true)
                .setPlaceholder('Menu Expired');
            
            const disabledRow = new ActionRowBuilder().addComponents(disabledMenu);
            
            // Rebuild home container with disabled row
            const finalData = pages.home;
            const finalContainer = new ContainerBuilder()
                .setAccentColor(0x888888)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${finalData.title}`))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(finalData.desc))
                .addSeparatorComponents(new SeparatorBuilder())
                .addActionRowComponents(disabledRow); // Disabled Menu inside

            interaction.editReply({ 
                components: [finalContainer] 
            }).catch(() => {});
        });
    },
};
