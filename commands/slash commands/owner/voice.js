const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');

// This creates a simple database file in your main bot folder
const dbPath = path.join(process.cwd(), 'voice_data.json');

function loadVoiceData() {
    if (!fs.existsSync(dbPath)) return {};
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function saveVoiceData(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 4));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voice')
        .setDescription('Manage the 24/7 voice connection')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        // --- JOIN COMMAND ---
        .addSubcommand(sub => 
            sub.setName('join')
                .setDescription('Join a voice channel and stay 24/7')
                .addChannelOption(opt => 
                    opt.setName('channel')
                        .setDescription('The voice channel to join')
                        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
                        .setRequired(true)
                )
        )

        // --- LEAVE COMMAND ---
        .addSubcommand(sub => 
            sub.setName('leave')
                .setDescription('Leave the current voice channel')
        ),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const sub = interaction.options.getSubcommand();

        // ===============================================
        // 1. JOIN LOGIC
        // ===============================================
        if (sub === 'join') {
            const channel = interaction.options.getChannel('channel');

            try {
                // Join the voice channel
                joinVoiceChannel({
                    channelId: channel.id,
                    guildId: channel.guild.id,
                    adapterCreator: channel.guild.voiceAdapterCreator,
                    selfDeaf: true, // Deafens the bot to save internet bandwidth
                    selfMute: false
                });

                // Save to JSON so it remembers to join after a restart
                const data = loadVoiceData();
                data[channel.guild.id] = channel.id;
                saveVoiceData(data);

                return interaction.editReply({ content: `<:yes:1297814648417943565> Joined ${channel} and will stay 24/7!` });
            } catch (error) {
                console.error(error);
                return interaction.editReply({ content: '<:no:1297814819105144862> Failed to join the voice channel. Check my permissions.' });
            }
        } 
        
        // ===============================================
        // 2. LEAVE LOGIC
        // ===============================================
        else if (sub === 'leave') {
            const connection = getVoiceConnection(interaction.guild.id);

            if (!connection) {
                return interaction.editReply({ content: '<:no:1297814819105144862> I am not currently in a voice channel.' });
            }

            // Disconnect
            connection.destroy();

            // Remove from JSON so it doesn't auto-rejoin when you restart
            const data = loadVoiceData();
            if (data[interaction.guild.id]) {
                delete data[interaction.guild.id];
                saveVoiceData(data);
            }

            return interaction.editReply({ content: '<:yes:1297814648417943565> Left the voice channel and disabled 24/7 mode.' });
        }
    }
};
