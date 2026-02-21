const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(process.cwd(), 'quran_data.json');

// --- 114 SURAHS LIST ---
const surahNames = [
    "Al-Fatihah", "Al-Baqarah", "Ali 'Imran", "An-Nisa", "Al-Ma'idah", "Al-An'am", "Al-A'raf", "Al-Anfal", "At-Tawbah", "Yunus",
    "Hud", "Yusuf", "Ar-Ra'd", "Ibrahim", "Al-Hijr", "An-Nahl", "Al-Isra", "Al-Kahf", "Maryam", "Taha",
    "Al-Anbiya", "Al-Hajj", "Al-Mu'minun", "An-Nur", "Al-Furqan", "Ash-Shu'ara", "An-Naml", "Al-Qasas", "Al-'Ankabut", "Ar-Rum",
    "Luqman", "As-Sajdah", "Al-Ahzab", "Saba", "Fatir", "Ya-Sin", "As-Saffat", "Sad", "Az-Zumar", "Ghafir",
    "Fussilat", "Ash-Shura", "Az-Zukhruf", "Ad-Dukhan", "Al-Jathiyah", "Al-Ahqaf", "Muhammad", "Al-Fath", "Al-Hujurat", "Qaf",
    "Ad-Dhariyat", "At-Tur", "An-Najm", "Al-Qamar", "Ar-Rahman", "Al-Waqi'ah", "Al-Hadid", "Al-Mujadila", "Al-Hashr", "Al-Mumtahanah",
    "As-Saff", "Al-Jumu'ah", "Al-Munafiqun", "At-Taghabun", "At-Talaq", "At-Tahrim", "Al-Mulk", "Al-Qalam", "Al-Haqqah", "Al-Ma'arij",
    "Nuh", "Al-Jinn", "Al-Muzzammil", "Al-Muddaththir", "Al-Qiyamah", "Al-Insan", "Al-Mursalat", "An-Naba'", "An-Nazi'at", "'Abasa",
    "At-Takwir", "Al-Infitar", "Al-Mutaffifin", "Al-Inshiqaq", "Al-Buruj", "At-Tariq", "Al-A'la", "Al-Ghashiyah", "Al-Fajr", "Al-Balad",
    "Ash-Shams", "Al-Layl", "Ad-Duhaa", "Ash-Sharh", "At-Tin", "Al-'Alaq", "Al-Qadr", "Al-Bayyinah", "Az-Zalzalah", "Al-'Adiyat",
    "Al-Qari'ah", "At-Takathur", "Al-'Asr", "Al-Humazah", "Al-Fil", "Quraysh", "Al-Ma'un", "Al-Kawthar", "Al-Kafirun", "An-Nasr",
    "Al-Masad", "Al-Ikhlas", "Al-Falaq", "An-Nas"
];

// --- GENERATE YASSER AL-DOSARI PLAYLIST ---
const playlist = surahNames.map((name, index) => {
    // Converts index 0 to "001", index 1 to "002", etc.
    const trackNumber = String(index + 1).padStart(3, '0');
    return {
        title: `Surah ${name}`,
        url: `https://server11.mp3quran.net/yasser/${trackNumber}.mp3` // Updated to Yasser Al-Dosari
    };
});

const guildPlayers = new Map();
const guildQueues = new Map();

function loadData() {
    if (!fs.existsSync(dbPath)) return {};
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function saveData(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 4));
}

// --- PLAYER LOGIC ---
async function playTrack(guild, player) {
    const currentIndex = guildQueues.get(guild.id) || 0;
    const track = playlist[currentIndex];
    
    try {
        // 1. Play the Audio
        const resource = createAudioResource(track.url);
        player.play(resource);
        
        // Save track for bot custom status (ready.js)
        guild.client.currentTrack = track.title; 

        // 2. Set the Voice Channel Status (Activity Text under VC)
        const connection = getVoiceConnection(guild.id);
        if (connection && connection.joinConfig.channelId) {
            try {
                await guild.client.rest.put(
                    `/channels/${connection.joinConfig.channelId}/voice-status`, 
                    { body: { status: `📖 ${track.title}` } }
                );
            } catch (statusErr) {
                console.error("Could not set voice channel status. Check permissions:", statusErr);
            }
        }

    } catch (err) {
        console.error("Error playing track:", err);
    }
}

async function startPlaying(guild, connection) {
    let player = guildPlayers.get(guild.id);
    
    if (!player) {
        player = createAudioPlayer();
        guildPlayers.set(guild.id, player);
        guildQueues.set(guild.id, 0);

        // --- NEW: Catch and log audio errors! ---
        player.on('error', error => {
            console.error(`❌ Audio Player Error: ${error.message}`);
        });


        // When a track finishes, move to the next one automatically
        player.on(AudioPlayerStatus.Idle, () => {
            let currentIndex = guildQueues.get(guild.id) || 0;
            currentIndex++;
            if (currentIndex >= playlist.length) currentIndex = 0; // Loop back to Al-Fatihah when finished
            guildQueues.set(guild.id, currentIndex);
            
            playTrack(guild, player);
        });
    }
    
    connection.subscribe(player);
    if (player.state.status !== AudioPlayerStatus.Playing) {
        playTrack(guild, player);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quran-play')
        .setDescription('Manage the 24/7 Quran radio (Yasser Al-Dosari)')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addSubcommand(sub => 
            sub.setName('enable')
                .setDescription('Join a channel, start playback, and update VC status')
                .addChannelOption(opt => 
                    opt.setName('channel')
                        .setDescription('The voice channel to join')
                        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub => 
            sub.setName('disable')
                .setDescription('Stop playback, clear VC status, and leave the channel')
        ),

    // Exported so ready.js can access it
    startPlaying, 

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const sub = interaction.options.getSubcommand();

        if (sub === 'enable') {
            const channel = interaction.options.getChannel('channel');

            try {
                const connection = joinVoiceChannel({
                    channelId: channel.id,
                    guildId: channel.guild.id,
                    adapterCreator: channel.guild.voiceAdapterCreator,
                    selfDeaf: true, 
                    selfMute: false
                });

                const data = loadData();
                data[channel.guild.id] = channel.id;
                saveData(data);

                // Start the audio loop
                startPlaying(interaction.guild, connection);

                return interaction.editReply({ content: `<:yes:1297814648417943565> Joined ${channel} and started 24/7 playback (Yasser Al-Dosari)!` });
            } catch (error) {
                console.error(error);
                return interaction.editReply({ content: '<:no:1297814819105144862> Failed to join the channel.' });
            }
        } 
        else if (sub === 'disable') {
            const connection = getVoiceConnection(interaction.guild.id);

            if (!connection) {
                return interaction.editReply({ content: '<:no:1297814819105144862> I am not currently in a voice channel.' });
            }

            // Attempt to clear the Voice Channel Status before leaving
            try {
                await interaction.client.rest.put(
                    `/channels/${connection.joinConfig.channelId}/voice-status`, 
                    { body: { status: "" } }
                );
            } catch (e) {}

            // Stop player and disconnect
            const player = guildPlayers.get(interaction.guild.id);
            if (player) player.stop();
            connection.destroy();
            interaction.client.currentTrack = null; 

            const data = loadData();
            if (data[interaction.guild.id]) {
                delete data[interaction.guild.id];
                saveData(data);
            }

            return interaction.editReply({ content: '<:yes:1297814648417943565> Disabled playback and left the channel.' });
        }
    }
};
