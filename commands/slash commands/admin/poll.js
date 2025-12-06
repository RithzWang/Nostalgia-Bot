const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Create a poll')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        // --- 1. REQUIRED OPTIONS ---
        .addStringOption(option =>
            option.setName('question')
                .setDescription('The question to ask')
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName('answer1')
                .setDescription('First answer')
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName('answer2')
                .setDescription('Second answer')
                .setRequired(true)
        )

        // --- 2. SETTINGS ---
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Where to post this poll? Empty = Here')
                .addChannelTypes(ChannelType.GuildText)
        )
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Duration (Default: 24 Hours)')
                .addChoices(
                    { name: '1 Hour', value: 1 },
                    { name: '4 Hours', value: 4 },
                    { name: '8 Hours', value: 8 },
                    { name: '12 Hours', value: 12 },
                    { name: '1 Day', value: 24 },
                    { name: '3 Days', value: 72 },
                    { name: '1 Week', value: 168 }
                )
        )
        .addBooleanOption(option =>
            option.setName('multiselect')
                .setDescription('Allow multiple votes? (Default: False)')
        )

        // --- 3. EMOJIS FOR REQUIRED ANSWERS ---
        .addStringOption(option => option.setName('emoji1').setDescription('Emoji for answer 1'))
        .addStringOption(option => option.setName('emoji2').setDescription('Emoji for answer 2'))

        // --- 4. EXTRA ANSWERS (3-10) ---
        // We chain these in pairs (Answer + Emoji) so they appear logically in the menu
        .addStringOption(option => option.setName('answer3').setDescription('Answer 3'))
        .addStringOption(option => option.setName('emoji3').setDescription('Emoji for answer 3'))
        
        .addStringOption(option => option.setName('answer4').setDescription('Answer 4'))
        .addStringOption(option => option.setName('emoji4').setDescription('Emoji for answer 4'))

        .addStringOption(option => option.setName('answer5').setDescription('Answer 5'))
        .addStringOption(option => option.setName('emoji5').setDescription('Emoji for answer 5'))

        .addStringOption(option => option.setName('answer6').setDescription('Answer 6'))
        .addStringOption(option => option.setName('emoji6').setDescription('Emoji for answer 6'))

        .addStringOption(option => option.setName('answer7').setDescription('Answer 7'))
        .addStringOption(option => option.setName('emoji7').setDescription('Emoji for answer 7'))

        .addStringOption(option => option.setName('answer8').setDescription('Answer 8'))
        .addStringOption(option => option.setName('emoji8').setDescription('Emoji for answer 8'))

        .addStringOption(option => option.setName('answer9').setDescription('Answer 9'))
        .addStringOption(option => option.setName('emoji9').setDescription('Emoji for answer 9'))

        .addStringOption(option => option.setName('answer10').setDescription('Answer 10'))
        .addStringOption(option => option.setName('emoji10').setDescription('Emoji for answer 10')),

    async execute(interaction) {
        // 1. Get Options
        const questionText = interaction.options.getString('question');
        const duration = interaction.options.getInteger('duration') || 24;
        const allowMultiselect = interaction.options.getBoolean('multiselect') || false;
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

        // 2. Build Answers (Loop increased to 10)
        const answers = [];
        for (let i = 1; i <= 10; i++) {
            const text = interaction.options.getString(`answer${i}`);
            const emoji = interaction.options.getString(`emoji${i}`);

            if (text) {
                const answerObj = { text: text };
                // Only add emoji if provided and not empty
                if (emoji) answerObj.emoji = emoji.trim(); 
                answers.push(answerObj);
            }
        }

        const pollData = {
            question: { text: questionText },
            answers: answers,
            duration: duration,
            allowMultiselect: allowMultiselect,
        };

        try {
            // STEP A: Send the poll
            await targetChannel.send({ poll: pollData });

            // STEP B: Confirm
            await interaction.reply({ 
                content: `I created a poll in ${targetChannel}`, 
                flags: MessageFlags.Ephemeral 
            });

        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: 'Failed to send poll. Check my permissions or ensure the emojis are valid!', 
                flags: MessageFlags.Ephemeral 
            });
        }
    },
};
