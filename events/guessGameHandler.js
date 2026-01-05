const { 
    Events, 
    ContainerBuilder, 
    TextDisplayBuilder, 
    SectionBuilder, 
    SeparatorBuilder, 
    SeparatorSpacingSize,
    MessageFlags 
} = require('discord.js');

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
            while (newWord === game.currentWord) {
                newWord = words[Math.floor(Math.random() * words.length)];
            }
            const newHidden = hideWord(newWord);

            game.currentWord = newWord;
            game.displayWord = newHidden;
            await game.save();

            const container = new ContainerBuilder()
                .setAccentColor(0x57F287) // Green
                .addSectionComponents(section => 
                    section.addTextDisplayComponents(text => 
                        // 👇 Custom YES emoji here
                        text.setContent(`### <:yes:1297814648417943565> Correct! \n**${message.author.username}** guessed the word!`)
                    )
                    .setThumbnailAccessory(thumb => thumb.setURL(message.author.displayAvatarURL()))
                )
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
                .addSectionComponents(section => 
                    section.addTextDisplayComponents(text => 
                        text.setContent(`### Next Word:\n# \` ${newHidden} \``)
                    )
                );

            await message.reply({ 
                components: [container], 
                flags: MessageFlags.IsComponentsV2 
            });

        } else {
            // --- WRONG GUESS ---
            try {
                // 👇 Custom NO emoji here
                const wrongMsg = await message.reply({ content: `<:no:1297814819105144862> Wrong guess!` });
                setTimeout(async () => {
                    await message.delete().catch(() => {});
                    await wrongMsg.delete().catch(() => {});
                }, 3000);
            } catch (e) {}
        }
    },
};
