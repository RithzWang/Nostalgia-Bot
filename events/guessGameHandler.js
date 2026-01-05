const { Events, EmbedBuilder } = require('discord.js');
const GuessGame = require('../src/models/GuessGame');
const { words } = require('../guessword.json');

function hideWord(word) {
    const chars = word.split('');
    const visibleCount = Math.floor(chars.length / 2); 
    const indices = new Set();
    while(indices.size < visibleCount) {
        indices.add(Math.floor(Math.random() * chars.length));
    }
    return chars.map((c, i) => indices.has(i) ? c : '_').join(' ');
}

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (message.author.bot || !message.guild) return;

        const game = await GuessGame.findOne({ guildId: message.guild.id, channelId: message.channel.id });
        if (!game) return;

        const guess = message.content.trim().toUpperCase();

        // --- CORRECT GUESS ---
        if (guess === game.currentWord) {
            
            let newWord = words[Math.floor(Math.random() * words.length)];
            // Avoid repeat
            while (newWord === game.currentWord) {
                newWord = words[Math.floor(Math.random() * words.length)];
            }
            const newHidden = hideWord(newWord);

            game.currentWord = newWord;
            game.displayWord = newHidden;
            await game.save();

            const embed = new EmbedBuilder()
                .setTitle('<:yes:1297814648417943565> Correct!')
                .setDescription(`**${message.author.username}** guessed the word!\n\n### Next Word:\n# \` ${newHidden} \``)
                .setThumbnail(message.author.displayAvatarURL())
                .setColor(0x57F287); // Green

            await message.reply({ embeds: [embed] });

        } else {
            // --- WRONG GUESS ---
            try {
                // Reply with error
                const wrongMsg = await message.reply({ content: `<:no:1297814819105144862> Wrong guess!` });
                
                // Delete both the user's wrong guess AND the bot's reply after 3 seconds
                setTimeout(async () => {
                    await message.delete().catch(() => {});
                    await wrongMsg.delete().catch(() => {});
                }, 3000);
            } catch (e) {
                // Ignore errors if message is already deleted
            }
        }
    },
};
