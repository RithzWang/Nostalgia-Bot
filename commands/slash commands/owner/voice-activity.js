const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const { joinVoiceChannel, getVoiceConnection } = require('@discordjs/voice');
const fs = require('fs');
const path = require('path');

// Saves to a new JSON file
const dbPath = path.join(process.cwd(), 'voice_activity.json');

// --- EMOJIS / MESSAGES TO CYCLE THROUGH ---
// You can change or add to this list!
const activityMessages = [
    "🌟 Chilling in VC",
    "🎮 Gaming Time",
    "🎵 Vibing",
    "✨ Magic",
    "🚀 To the moon!",
    "🔥 So cool",
    "💤 Sleeping...",
    "🍕 Pizza time",
    "🎉 Party!",
    "🤖 Beep Boop"
];

// Stores the timers so we can stop them later
const guildIntervals = new Map();

function loadData() {
    if (!fs.existsSync(dbPath)) return {};
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function saveData(data) {
    fs.writeFileSync(dbPath, JSON.stringify(data, null, 4));
}

// --- ACTIVITY LOOP LOGIC ---
function startActivity(guild, channelId) {
    // Clear any existing loop to prevent duplicates
    if (guildIntervals.has(guild.id)) {
        clearInterval(guildIntervals.get(guild.id));
    }

    const interval = setInterval(async () => {
        const randomMsg = activityMessages[Math.floor(Math.random() * activityMessages.length)];
        
        try {
            await guild.client.rest.put(
                `/channels/${channelId}/voice-status`, 
                { body: { status: randomMsg } }
            );
        } catch (err) {
            // Discord might rate-limit if 5 seconds is too fast, this safely ignores it.
            if (err.status !== 429) {
                console.error("[Voice Activity] Error setting status:", err.message);
            }
        }
    }, 5000); // 5000 milliseconds = 5 seconds

    guildIntervals.set(guild.id, interval);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voice-activity')
        .setDescription('24/7 Voice connection with changing activity status')
        .setDMPermission(false)
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

        .addSubcommand(sub => 
            sub.setName('enable')
                .setDescription('Join a channel and start changing the VC status')
                .addChannelOption(opt => 
                    opt.setName('channel')
                        .setDescription('The voice channel to join')
                        .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
                        .setRequired(true)
                )
        )
        .addSubcommand(sub => 
            sub.setName('disable')
                .setDescription('Stop activity, clear status, and leave the channel')
        ),

    // Exported so ready.js can trigger it when the bot restarts
    startActivity, 

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const sub = interaction.options.getSubcommand();

        if (sub === 'enable') {
            const channel = interaction.options.getChannel('channel');

            try {
                joinVoiceChannel({
                    channelId: channel.id,
                    guildId: channel.guild.id,
                    adapterCreator: channel.guild.voiceAdapterCreator,
                    selfDeaf: true, 
                    selfMute: true // We mute the bot because it doesn't need to play audio
                });

                const data = loadData();
                data[channel.guild.id] = channel.id;
                saveData(data);

                // Start the loop
                startActivity(interaction.guild, channel.id);

                return interaction.editReply({ content: `<:yes:1297814648417943565> Joined ${channel} and started Voice Activity loop!` });
            } catch (error) {
                console.error(error);
                return interaction.editReply({ content: '<:no:1297814819105144862> Failed to join the channel.' });
            }
        } 
        else if (sub === 'disable') {
            const connection = getVoiceConnection(interaction.guild.id);
            const data = loadData();
            const channelId = data[interaction.guild.id];

            // 1. Stop the 5-second timer
            if (guildIntervals.has(interaction.guild.id)) {
                clearInterval(guildIntervals.get(interaction.guild.id));
                guildIntervals.delete(interaction.guild.id);
            }

            // 2. Clear the VC text
            if (channelId) {
                try {
                    await interaction.client.rest.put(
                        `/channels/${channelId}/voice-status`, 
                        { body: { status: "" } }
                    );
                } catch (e) {}
            }

            // 3. Disconnect
            if (connection) connection.destroy();

            // 4. Remove from JSON
            if (data[interaction.guild.id]) {
                delete data[interaction.guild.id];
                saveData(data);
            }

            return interaction.editReply({ content: '<:yes:1297814648417943565> Disabled Voice Activity and left the channel.' });
        }
    }
};
