const { 
    SlashCommandBuilder, 
    PermissionFlagsBits,
    MessageFlags,
    EmbedBuilder
} = require('discord.js');
const djs = require('discord.js'); // Required for injecting classes into the evaluator
const moment = require('moment-timezone');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('convert')
        .setDescription('Developer command: Convert D.JS code into a live message payload.')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Extra layer of safety

        // --- SUBCOMMAND: SEND ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('send')
                .setDescription('Executes component code and sends it as a new message')
                .addStringOption(option => 
                    option.setName('code')
                    .setDescription('The discord.js code to evaluate (defines components, embeds, etc.)')
                    .setRequired(true))
        )

        // --- SUBCOMMAND: EDIT ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit')
                .setDescription('Executes component code and edits an existing message')
                .addStringOption(option => 
                    option.setName('message_id')
                    .setDescription('The ID of the message to edit')
                    .setRequired(true))
                .addStringOption(option => 
                    option.setName('code')
                    .setDescription('The discord.js code to evaluate')
                    .setRequired(true))
                .addChannelOption(option => 
                    option.setName('channel')
                    .setDescription('The channel the message is in (defaults to current channel)'))
        ),

    async execute(interaction) {
        // ==========================================
        // 🔒 SECURITY LOCK: REPLACE WITH YOUR ID
        // ==========================================
        const DEVELOPER_ID = '837741275603009626'; 
        
        if (interaction.user.id !== DEVELOPER_ID) {
            return interaction.reply({ 
                content: '<:no:1297814819105144862> You are not authorized to use this developer command.', 
                flags: MessageFlags.Ephemeral 
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const codeString = interaction.options.getString('code');
        
        await interaction.deferReply({ flags: MessageFlags.Ephemeral }); // Keep the setup hidden

        try {
            // --- 1. CLEAN THE CODE ---
            // Remove markdown formatting and common import/require statements so it doesn't crash the evaluator
            let cleanCode = codeString
                .replace(/
http://googleusercontent.com/immersive_entry_chip/0)