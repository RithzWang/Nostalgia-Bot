const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    // Arrays/Collections Setup
    // We attach these to the client so we can access them in other files
    client.slashCommands = new Map(); // or new Collection() if you import it
    client.prefixCommands = new Map(); 
    client.slashDatas = []; // We store the raw data here for the deploy script

    // ====================================================
    // 1. SLASH COMMANDS LOADER (Recursive)
    // Path: handlers/ -> .. -> commands -> slash commands
    // ====================================================
    const slashCommandsFolder = path.join(__dirname, 'commands', 'slash commands');

    const loadSlashCommands = (dir) => {
        if (!fs.existsSync(dir)) return;

        const files = fs.readdirSync(dir);

        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.lstatSync(filePath);

            if (stat.isDirectory()) {
                // If folder (e.g. 'owner'), go deeper
                loadSlashCommands(filePath);
            } else if (file.endsWith('.js')) {
                delete require.cache[require.resolve(filePath)];
                const command = require(filePath);

                if (command.data && command.data.name) {
                    client.slashCommands.set(command.data.name, command);
                    client.slashDatas.push(command.data.toJSON());
                    console.log(`[Slash] Loaded: ${command.data.name}`);
                }
            }
        }
    };

    loadSlashCommands(slashCommandsFolder);


    // ====================================================
    // 2. PREFIX COMMANDS LOADER (Recursive)
    // Path: handlers/ -> .. -> commands -> prefix commands
    // ====================================================
    const prefixCommandsFolder = path.join(__dirname, 'commands', 'prefix commands');

    const loadPrefixCommands = (dir) => {
        if (!fs.existsSync(dir)) return;

        const files = fs.readdirSync(dir);

        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.lstatSync(filePath);

            if (stat.isDirectory()) {
                // If folder (e.g. 'admin'), go deeper
                loadPrefixCommands(filePath);
            } else if (file.endsWith('.js')) {
                delete require.cache[require.resolve(filePath)];
                const command = require(filePath);

                if (command.name) {
                    client.prefixCommands.set(command.name, command);
                    
                    // Handle Aliases
                    if (command.aliases && Array.isArray(command.aliases)) {
                        for (const alias of command.aliases) {
                            client.prefixCommands.set(alias, command);
                        }
                    }
                    console.log(`[Prefix] Loaded: ${command.name}`);
                }
            }
        }
    };

    loadPrefixCommands(prefixCommandsFolder);
};
