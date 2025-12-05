const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Create a fully custom poll')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        
        // --- SETTINGS ---
        .addStringOption(option =>
            option.setName('question')
                .setDescription('The question to ask')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('Duration in hours (Default: 24)')
                .setMinValue(1).setMaxValue(168)
        )
        .addBooleanOption(option =>
            option.setName('multiselect')
                .setDescription('Allow multiple votes? (Default: False)')
        )

        // --- OPTION 1 ---
        .addStringOption(option => option.setName('answer1').setDescription('First answer text').setRequired(true))
        .addStringOption(option => option.setName('emoji1').setDescription('Emoji for answer 1 (e.g. 🍎)'))

        // --- OPTION 2 ---
        .addStringOption(option => option.setName('answer2').setDescription('Second answer text').setRequired(true))
        .addStringOption(option => option.setName('emoji2').setDescription('Emoji for answer 2 (e.g. 🍌)'))

        // --- OPTION 3 (Optional) ---
        .addStringOption(option => option.setName('answer3').setDescription('Third answer text'))
        .addStringOption(option => option.setName('emoji3').setDescription('Emoji for answer 3'))

        // --- OPTION 4 (Optional) ---
        .addStringOption(option => option.setName('answer4').setDescription('Fourth answer text'))
        .addStringOption(option => option.setName('emoji4').setDescription('Emoji for answer 4')),

    async execute(interaction) {
        const questionText = interaction.options.getString('question');
        const duration = interaction.options.getInteger('duration') || 24;
        const allowMultiselect = interaction.options.getBoolean('multiselect') || false;

        // Collect answers and emojis
        const answers = [];
        
        // Loop through the 4 possible options defined above
        for (let i = 1; i <= 4; i++) {
            const text = interaction.options.getString(`answer${i}`);
            const emoji = interaction.options.getString(`emoji${i}`);

            if (text) {
                const answerObj = { text: text };
                
                // If the user provided an emoji, add it to the object
                if (emoji) {
                    answerObj.emoji = emoji.trim(); 
                }
                
                answers.push(answerObj);
            }
        }

        try {
            await interaction.reply({
                poll: {
                    question: { text: questionText },
                    answers: answers,
                    duration: duration,
                    allowMultiselect: allowMultiselect,
                }
            });
        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: '❌ Failed to create poll. (If using custom emojis, make sure they are from this server!)', 
                flags: MessageFlags.Ephemeral 
            });
        }
    },
};
