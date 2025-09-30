module.exports = {
    name: 'fortune',
    description: 'Gives a random fortune message.',
    execute(message, args, client) {
        const target = message.mentions.users.first() || message.author;
        
        const silentMessageOptions = {
    allowedMentions: {
      parse: [], // Don't parse any mentions
    },
  };

        // Array of 20 unique fortunes
        const fortunes = [
            '🌟 Today is your lucky day!',
            '⚡ A surprise is waiting for you soon.',
            '💡 Wisdom comes from unexpected places.',
            '🎯 Your focus will lead you to success.',
            '🔥 Beware of distractions, stay sharp!',
            '🍀 Something good is coming your way.',
            '✨ Your creativity will shine today.',
            '🌈 Happiness is closer than you think.',
            '🚀 Big opportunities are ahead!',
            '💎 You will discover a hidden talent.',
            '🌊 Go with the flow and great things happen.',
            '🕊️ Peace will find you in unexpected moments.',
            '🧩 A new challenge will bring growth.',
            '🌹 Kindness you show will return to you.',
            '🛤️ A path you hesitate to take is worth it.',
            '🎵 Joy can be found in simple things today.',
            '💫 Believe in yourself and others will too.',
            '🗝️ A secret will soon be revealed to you.',
            '🏔️ Overcoming obstacles brings reward.',
            '🌌 Adventure awaits if you take the leap.'
        ];

        // Pick a random fortune
        const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];

        // Send plain message
        message.channel.send(`💌 **<@${target.id}>**, your fortune is:\n${fortune}`);
    },
};