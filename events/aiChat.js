const { Events } = require('discord.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const ChatBot = require('../src/models/ChatBot');

// Setup Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });


module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        // 1. Basic Filters
        if (message.author.bot) return; // Ignore bots
        if (!message.guild) return;     // Ignore DMs
        if (message.content.startsWith('!')) return; // Ignore commands

        try {
            // 2. Check Database
            // See if this server has a chatbot channel configured
            const config = await ChatBot.findOne({ GuildID: message.guild.id });
            
            // If no config, or wrong channel, stop here
            if (!config || config.ChannelID !== message.channel.id) return;

            // 3. Send "Typing..."
            await message.channel.sendTyping();

            // 4. Generate AI Response
            if (!process.env.GEMINI_API_KEY) return console.log("Missing GEMINI_API_KEY");

            const result = await model.generateContent(message.content);
            const response = await result.response;
            const text = response.text();

            // 5. Send Reply (Handle long messages)
            if (text.length > 2000) {
                await message.reply(text.substring(0, 2000));
            } else {
                await message.reply(text);
            }

        } catch (error) {
            console.error("AI Chat Error:", error);
            // Optional: React with emoji to show failure instead of spamming chat
            // message.react('❌'); 
        }
    },
};
