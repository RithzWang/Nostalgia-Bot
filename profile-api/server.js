// server.js - THE PROXY SERVER
const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = 3000;

// ⚠️ PUT YOUR ALT ACCOUNT TOKEN HERE
// DO NOT SHARE THIS TOKEN WITH ANYONE
const USER_TOKEN = process.env.USER_TOKEN; 

app.get('/v1/profile/:id', async (req, res) => {
    const userId = req.params.id;

    try {
        // We request the /profile endpoint, which Bots cannot access
        const response = await fetch(`https://discord.com/api/v9/users/${userId}/profile`, {
            headers: {
                'Authorization': USER_TOKEN
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: 'Failed to fetch from Discord' });
        }

        const data = await response.json();
        return res.json(data);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Proxy API running at http://localhost:${PORT}`);
});
