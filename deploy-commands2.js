// ... (imports remain the same)
// --- IMPORTANT: CONFIGURE THESE ---
const BOT_TOKEN = 'YOUR_BOT_TOKEN_HERE'; 
const CLIENT_ID = 'YOUR_CLIENT_ID_HERE'; 
const GUILD_ID = 'YOUR_SERVER_ID_HERE'; 
// ---------------------------------

// REMOVE ALL COMMAND DEFINITIONS LIKE 'const embedCommand = new SlashCommandBuilder()...'

// Define the commands array as empty
const commands = [].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // This will overwrite the existing commands with an empty list
        const data = await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands },
        );

        console.log(`Successfully deleted ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();