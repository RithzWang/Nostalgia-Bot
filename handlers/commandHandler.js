const fs = require('fs');
const path = require('path');

module.exports = (client) => {
    // 1. Setup Collections
    // We reuse 'slashCommands' for BOTH Slash and Context menus because Discord treats them similarly.
    client.slashCommands = new Map(); 
    client.slashDatas = []; 

    // --- HELPER: Recursive File Loader ---
    const loadCommands = (dir) => {
        // If folder doesn't exist, skip it safely
        if (!fs.existsSync(dir)) return;

        const files = fs.readdirSync(dir);

        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.lstatSync(filePath);

            if (stat.isDirectory()) {
                // If it's a folder (e.g. 'admin'), go deeper
                loadCommands(filePath);
            } else if (file.endsWith('.js')) {
                // Clear cache so you don't have to restart node process entirely if using nodemon
                delete require.cache[require.resolve(filePath)];
                
                try {
                    const command = require(filePath);

                    // Check if it's a valid command file
                    if (command.data && command.data.name) {
                        // Store the command in the client
                        client.slashCommands.set(command.data.name, command);
                        
                        // Push JSON data for the deploy script
                        client.slashDatas.push(command.data.toJSON());
                        
                        console.log(`[Command] Loaded: ${command.data.name}`);
                    } else {
                        console.warn(`[Warning] The command at ${filePath} is missing "data.name".`);
                    }
                } catch (error) {
                    console.error(`[Error] Failed to load ${filePath}:`, error);
                }
            }
        }
    };

    // ====================================================
    // 2. LOAD EVERYTHING
    // ====================================================
    
    // A. Load Slash Commands
    const slashFolder = path.join(__dirname, '..', 'commands', 'slash commands');
    loadCommands(slashFolder);

    // B. Load Context Menu Commands (Where 'jumbo.js' lives)
    const contextFolder = path.join(__dirname, '..', 'commands', 'context');
    loadCommands(contextFolder);
};
