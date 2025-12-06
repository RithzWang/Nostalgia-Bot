const { 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ComponentType,
    EmbedBuilder,
    MessageFlags // 1. Added MessageFlags to imports
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rps')
        .setDescription('Play Rock Paper Scissors against the bot'),

    async execute(interaction) {
        // 1. Create the Buttons
        const rockButton = new ButtonBuilder()
            .setCustomId('rock')
            .setLabel('Rock')
            .setEmoji('🪨')
            .setStyle(ButtonStyle.Primary);

        const paperButton = new ButtonBuilder()
            .setCustomId('paper')
            .setLabel('Paper')
            .setEmoji('📄')
            .setStyle(ButtonStyle.Primary);

        const scissorsButton = new ButtonBuilder()
            .setCustomId('scissors')
            .setLabel('Scissors')
            .setEmoji('✂️')
            .setStyle(ButtonStyle.Primary);

        // 2. Put buttons in a Row
        const row = new ActionRowBuilder()
            .addComponents(rockButton, paperButton, scissorsButton);

        // 3. Create the Embed
        const embed = new EmbedBuilder()
            .setColor('Blue')
            .setTitle('Rock, Paper, Scissors!')
            .setDescription('Choose your weapon below to start the game.');

        // 4. Send the message (Public, so everyone can see the game)
        const response = await interaction.reply({
            embeds: [embed],
            components: [row],
        });

        // 5. Create a Collector (Listens for clicks for 30 seconds)
        const collector = response.createMessageComponentCollector({ 
            componentType: ComponentType.Button, 
            time: 30000 
        });

        collector.on('collect', async (i) => {
            // Check if the clicker is the command sender
            if (i.user.id !== interaction.user.id) {
                // 2. Updated to use MessageFlags.Ephemeral
                return i.reply({ 
                    content: '❌ Start your own game with /rps!', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            // Logic: Bot picks random
            const choices = ['rock', 'paper', 'scissors'];
            const botChoice = choices[Math.floor(Math.random() * choices.length)];
            const userChoice = i.customId;

            // Determine Winner
            let result;
            if (userChoice === botChoice) {
                result = "It's a Tie! 🤝";
            } else if (
                (userChoice === 'rock' && botChoice === 'scissors') ||
                (userChoice === 'paper' && botChoice === 'rock') ||
                (userChoice === 'scissors' && botChoice === 'paper')
            ) {
                result = "You Win! 🎉";
            } else {
                result = "You Lose! 🤖";
            }

            // Disable buttons after game
            rockButton.setDisabled(true);
            paperButton.setDisabled(true);
            scissorsButton.setDisabled(true);

            // Update the message with the result
            await i.update({
                content: `You chose **${userChoice}** vs Bot's **${botChoice}**`,
                embeds: [
                    new EmbedBuilder()
                        .setColor(result.includes('Win') ? 'Green' : result.includes('Lose') ? 'Red' : 'Yellow')
                        .setTitle(result)
                        .setDescription(`You: ${getEmoji(userChoice)} | Bot: ${getEmoji(botChoice)}`)
                ],
                components: [new ActionRowBuilder().addComponents(rockButton, paperButton, scissorsButton)]
            });
            
            // Stop the collector since game is over
            collector.stop();
        });

        collector.on('end', async (collected, reason) => {
            // If time ran out (user didn't click), disable buttons
            if (reason === 'time') {
                rockButton.setDisabled(true);
                paperButton.setDisabled(true);
                scissorsButton.setDisabled(true);
                
                try {
                    await interaction.editReply({
                        content: '⏰ Time ran out!',
                        components: [new ActionRowBuilder().addComponents(rockButton, paperButton, scissorsButton)]
                    });
                } catch (e) {
                    // Message might have been deleted, ignore error
                }
            }
        });
    },
};

// Helper function to get emoji
function getEmoji(choice) {
    if (choice === 'rock') return '🪨';
    if (choice === 'paper') return '📄';
    return '✂️';
}
