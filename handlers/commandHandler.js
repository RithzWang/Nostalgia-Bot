const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    
    // =========================================
    //  PREFIX COMMANDS LOADER
    // =========================================
    client.prefixCommands = new Map(); // Or new Collection() if you have discord.js imported
    
    // Path: Go up one level (..), then into 'commands', then 'prefix commands'
    const prefixPath = path.join(__dirname, '..', 'commands', 'prefix commands');

    const loadPrefixCommands = (dir) => {
        if (!fs.existsSync(dir)) return;
        const files = fs.readdirSync(dir);

        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.lstatSync(filePath);

            if (stat.isDirectory()) {
                // Recursion for subfolders
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

    loadPrefixCommands(prefixPath);


    // =========================================
    //  SLASH COMMANDS LOADER (Optional/Future)
    // =========================================
    // You can copy your slash command logic here later using 
    // const slashPath = path.join(__dirname, '..', 'slash commands');
};
