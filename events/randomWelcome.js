const { Events } = require('discord.js');
const WelcomeConfig = require('../src/models/Welcome');

// The array of all your requested welcome messages
const welcomeMessages = [
    "Yay you made it, @user 🎉",
    "@user hopped into the server",
    "Glad to see you, @user",
    "@user is here 👀",
    "Everyone welcome @user!",
    "@user just joined the chaos",
    "Look who showed up — @user",
    "@user has entered the chat",
    "We’ve been expecting you, @user",
    "A wild @user appeared!",
    "Nice to have you here, @user",
    "@user pulled up 😎",
    "@user joined us, let’s gooo",
    "@user finally made it",
    "Heyyy @user, welcome in!",
    "@user unlocked the server",
    "Big welcome to @user ✨",
    "@user spawned in",
    "The server feels cooler with @user here",
    "@user just dropped by",
    "Guess who’s here? @user",
    "@user slid into the server",
    "New arrival: @user 🚨",
    "Good to have you, @user",
    "@user made their entrance",
    "@user joined the party 🎊",
    "Say hi to @user!",
    "@user found the server somehow",
    "@user is now part of the problem",
    "@user wandered into the server",
    "There you are, @user",
    "@user just landed here ✈️",
    "@user joined… hide the snacks",
    "@user came to vibe with us",
    "Welcome aboard, @user 🚀"
];

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member, client) {
        if (member.user.bot) return;

        try {
            // Check if this server has a welcome channel configured
            const config = await WelcomeConfig.findOne({ guildId: member.guild.id });
            if (!config || !config.channelId) return;

            // Fetch the channel
            const channel = member.guild.channels.cache.get(config.channelId) || await member.guild.channels.fetch(config.channelId).catch(() => null);
            if (!channel) return;

            // Pick a random message from the array
            const randomMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
            
            // Replace "@user" with the actual user ping
            const finalMessage = randomMessage.replace(/@user/g, `<@${member.id}>`);

            // Send the message
            await channel.send(finalMessage);

        } catch (error) {
            console.error("Random Welcome Event Error:", error);
        }
    }
};
