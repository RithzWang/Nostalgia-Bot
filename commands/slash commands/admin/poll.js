const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Create a fully custom poll')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Admin Only

        // --- 1. REQUIRED OPTIONS (MUST COME FIRST) ---
        .addStringOption(option =>
            option.setName('question')
                .setDescription('The question to ask')
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName('answer1')
                .setDescription('First answer text')
                .setRequired(true)
        )
        .addStringOption(option => 
            option.setName('answer2')
                .setDescription('Second answer text')
                .setRequired(true)
        )

        // --- 2. OPTIONAL SETTINGS (MUST COME AFTER) ---
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Where to post this poll? (Empty = Here)')
                .addChannelTypes(ChannelType.GuildText)
        )
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('How long should the poll last? (Default: 24 Hours)')
                .addChoices(
                    { name: '1 Hour', value: 1 },
                    { name: '4 Hours', value: 4 },
                    { name: '8 Hours', value: 8 },
                    { name: '12 Hours', value: 12 },
                    { name: '1 Day (24 Hours)', value: 24 },
                    { name: '3 Days', value: 72 },
                    { name: '1 Week', value: 168 }
                )
        )
        .addBooleanOption(option =>
            option.setName('multiselect')
                .setDescription('Allow multiple votes? (Default: False)')
        )

        // --- 3. OPTIONAL EMOJIS & EXTRA ANSWERS ---
        .addStringOption(option => option.setName('emoji1').setDescription('Emoji for answer 1 (e.g. 🍎)'))
        .addStringOption(option => option.setName('emoji2').setDescription('Emoji for answer 2 (e.g. 🍌)'))
        
        // Extra Answer 3
        .addStringOption(option => option.setName('answer3').setDescription('Third answer text'))
        .addStringOption(option => option.setName('emoji3').setDescription('Emoji for answer 3'))
        
        // Extra Answer 4
        .addStringOption(option => option.setName('answer4').setDescription('Fourth answer text'))
        .addStringOption(option => option.setName('emoji4').setDescription('Emoji for answer 4')),

    async execute(interaction) {
        // 1. Get Options
        const questionText = interaction.options.getString('question');
        const duration = interaction.options.getInteger('duration') || 24; // Default to 24 if they don't pick one
        const allowMultiselect = interaction.options.getBoolean('multiselect') || false;
        
        // Get the target channel (Default to current channel if null)
        const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

        // 2. Build Answers Array
        const answers = [];
        for (let i = 1; i <= 4; i++) {
            const text = interaction.options.getString(`answer${i}`);
            const emoji = interaction.options.getString(`emoji${i}`);

            if (text) {
                const answerObj = { text: text };
                if (emoji) answerObj.emoji = emoji.trim(); 
                answers.push(answerObj);
            }
        }

        // 3. Create the Poll Data Object
        const pollData = {
            question: { text: questionText },
            answers: answers,
            duration: duration,
            allowMultiselect: allowMultiselect,
        };

        try {
            // 4. Send Logic
            if (targetChannel.id === interaction.channel.id) {
                await interaction.reply({ poll: pollData });
            } else {
                await targetChannel.send({ poll: pollData });
                
                await interaction.reply({ 
                    content: `✅ Poll successfully sent to ${targetChannel}!`, 
                    flags: MessageFlags.Ephemeral 
                });
            }

        } catch (error) {
            console.error(error);
            await interaction.reply({ 
                content: '❌ Failed to send poll. Check my permissions in that channel or check your emojis!', 
                flags: MessageFlags.Ephemeral 
            });
        }
    },
};
