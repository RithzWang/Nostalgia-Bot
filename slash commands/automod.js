const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('Setup the auto mod system')
        .addSubcommand(command => 
            command
                .setName('flagged-words')
                .setDescription('Block profanity, sexual content, and slurs')
        )
        .addSubcommand(command => 
            command
                .setName('spam-messages')
                .setDescription('Block messages suspected of spam')
        )
        .addSubcommand(command => 
            command
                .setName('mention-spam')
                .setDescription('Block messages containing a certain amount of mentions')
                .addIntegerOption(option => 
                    option
                        .setName('number')
                        .setDescription('The number of mentions required to block a message')
                        .setRequired(true)
                )
        )
        .addSubcommand(command => 
            command
                .setName('keyword')
                .setDescription('Block a given keyword in the server')
                .addStringOption(option => 
                    option
                        .setName('word')
                        .setDescription('The word you want to block')
                        .setRequired(true)
                )
        ),
    async execute(interaction) {
        const { guild, options } = interaction;
        const sub = options.getSubcommand();

        if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return await interaction.reply({ 
                content: 'You don\'t have perms to set up Auto Mod within this server', 
                ephemeral: true 
            });
        }

        switch (sub) {
            case 'flagged-words':
                await interaction.reply({ content: 'Loading your auto mod rule...' });
                
                try {
                    await guild.autoModerationRules.create({
                        name: `Block profanity, sexual content, and slurs by ${interaction.client.user.username}`,
                        creatorId: interaction.client.user.id,
                        enabled: true,
                        eventType: 1, // MESSAGE_SEND
                        triggerType: 4, // KEYWORD_PRESET
                        triggerMetadata: {
                            presets: [1, 2, 3] // PROFANITY, SEXUAL_CONTENT, SLURS
                        },
                        actions: [
                            {
                                type: 1, // BLOCK_MESSAGE
                                metadata: {
                                    channel: interaction.channel,
                                    durationSeconds: 10,
                                    customMessage: 'This message was prevented by Auto Moderation'
                                }
                            }
                        ]
                    });

                    const embed = new EmbedBuilder()
                        .setColor('Blue')
                        .setDescription('✅ Your Auto Mod rule has been created. All swears will be stopped.');

                    await interaction.editReply({ content: '', embeds: [embed] });

                } catch (error) {
                    console.log(error);
                    await interaction.editReply({ content: `${error}` });
                }
                break;

            case 'keyword':
                await interaction.reply({ content: 'Loading your auto mod rule...' });
                const word = options.getString('word');

                try {
                    await guild.autoModerationRules.create({
                        name: `Prevent the word ${word} from being used by ${interaction.client.user.username}`,
                        creatorId: interaction.client.user.id,
                        enabled: true,
                        eventType: 1,
                        triggerType: 1, // KEYWORD
                        triggerMetadata: {
                            keywordFilter: [word]
                        },
                        actions: [
                            {
                                type: 1, 
                                metadata: {
                                    channel: interaction.channel,
                                    durationSeconds: 10,
                                    customMessage: 'This message was prevented by Auto Moderation'
                                }
                            }
                        ]
                    });

                    const embed2 = new EmbedBuilder()
                        .setColor('Blue')
                        .setDescription(`✅ Your Auto Mod rule has been created. All messages containing the word ${word} will be deleted.`);

                    await interaction.editReply({ content: '', embeds: [embed2] });

                } catch (error) {
                    console.log(error);
                    await interaction.editReply({ content: `${error}` });
                }
                break;

            case 'spam-messages':
                await interaction.reply({ content: 'Loading your auto mod rule...' });

                try {
                    await guild.autoModerationRules.create({
                        name: `Prevent spam messages by ${interaction.client.user.username}`,
                        creatorId: interaction.client.user.id,
                        enabled: true,
                        eventType: 1,
                        triggerType: 3, // SPAM
                        triggerMetadata: {},
                        actions: [
                            {
                                type: 1, 
                                metadata: {
                                    channel: interaction.channel,
                                    durationSeconds: 10,
                                    customMessage: 'This message was prevented by Auto Moderation'
                                }
                            }
                        ]
                    });

                    const embed3 = new EmbedBuilder()
                        .setColor('Blue')
                        .setDescription('✅ Your Auto Mod rule has been created. All messages suspected of spam will be deleted.');

                    await interaction.editReply({ content: '', embeds: [embed3] });

                } catch (error) {
                    console.log(error);
                    await interaction.editReply({ content: `${error}` });
                }
                break;

            case 'mention-spam':
                await interaction.reply({ content: 'Loading your auto mod rule...' });
                const number = options.getInteger('number');

                try {
                    await guild.autoModerationRules.create({
                        name: `Prevent spam mentions by ${interaction.client.user.username}`,
                        creatorId: interaction.client.user.id,
                        enabled: true,
                        eventType: 1,
                        triggerType: 5, // MENTION_SPAM
                        triggerMetadata: {
                            mentionTotalLimit: number
                        },
                        actions: [
                            {
                                type: 1, 
                                metadata: {
                                    channel: interaction.channel,
                                    durationSeconds: 10,
                                    customMessage: 'This message was prevented by Auto Moderation'
                                }
                            }
                        ]
                    });

                    const embed4 = new EmbedBuilder()
                        .setColor('Blue')
                        .setDescription(`✅ Your Auto Mod rule has been created. All messages containing ${number} mentions will be deleted.`);

                    await interaction.editReply({ content: '', embeds: [embed4] });

                } catch (error) {
                    console.log(error);
                    await interaction.editReply({ content: `${error}` });
                }
                break;
        }
    }
};
