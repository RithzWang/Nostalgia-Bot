const { Events } = require('discord.js');
// 1. Use 'require' instead of 'import'
const { GoogleGenerativeAI } = require("@google/generative-ai");
const ChatBot = require('../src/models/ChatBot');

// 2. Initialize properly for CommonJS
// Make sure you have GEMINI_API_KEY in your .env file
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 3. Use a safe model name (legacy SDK often needs "latest" suffix or "gemini-pro")
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        // --- FILTERS ---
        if (message.author.bot) return; 
        if (!message.guild) return;     
        if (message.content.startsWith('!')) return;

        try {
            // --- DATABASE CHECK ---
            const config = await ChatBot.findOne({ GuildID: message.guild.id });
            if (!config || config.ChannelID !== message.channel.id) return;

            // --- SEND TYPING ---
            await message.channel.sendTyping();

            if (!process.env.GEMINI_API_KEY) {
                return console.log("❌ Error: Missing GEMINI_API_KEY in .env");
            }

            // --- GENERATE CONTENT ---
            const result = await model.generateContent(message.content);
            const response = await result.response;
            const text = response.text();

            // --- SEND REPLY (SPLIT IF LONG) ---
            if (text.length > 2000) {
                await message.reply(text.substring(0, 2000));
            } else {
                await message.reply(text);
            }

        } catch (error) {
            console.error("AI Chat Error:", error);
            // Optional: await message.reply("My brain is disconnected!");
        }
    },
};
