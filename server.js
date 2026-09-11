const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = 3000;

// Allow front-end HTML to communicate with this server
app.use(cors());
// Allow server to parse JSON data sent from the front-end
app.use(express.json());

// -------------------------------------------------------------
// DATABASE SETUP
// -------------------------------------------------------------
// Connects to (or automatically creates) 'pokemon_votes.db'
const db = new sqlite3.Database('./pokemon_votes.db', (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        
        // Create the votes table automatically if it doesn't exist yet
        db.run(`
            CREATE TABLE IF NOT EXISTS votes (
                pokemon_id INTEGER PRIMARY KEY,
                upvotes INTEGER DEFAULT 0,
                downvotes INTEGER DEFAULT 0
            )
        `);
    }
});

// -------------------------------------------------------------
// API ENDPOINTS (Routes)
// -------------------------------------------------------------

// 1. GET VOTES: Gets current votes for a specific Pokemon ID
app.get('/api/votes/:id', (req, res) => {
    const pokemonId = req.params.id;

    const query = `SELECT upvotes, downvotes FROM votes WHERE pokemon_id = ?`;
    
    db.get(query, [pokemonId], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        // If the Pokemon hasn't been voted on yet, return 0 for both
        res.json(row || { upvotes: 0, downvotes: 0 });
    });
});

// 2. CAST VOTE: Adds an upvote or downvote for a Pokemon ID
app.post('/api/votes', (req, res) => {
    const { pokemonId, voteType } = req.body; // Expects JSON: { "pokemonId": 25, "voteType": "upvote" }

    if (!['upvote', 'downvote'].includes(voteType)) {
        return res.status(400).json({ error: 'Invalid vote type' });
    }

    const column = voteType === 'upvote' ? 'upvotes' : 'downvotes';

    // INSERT a new row if Pokemon isn't in database yet, 
    // or UPDATE (increment by 1) if it already exists.
    const query = `
        INSERT INTO votes (pokemon_id, ${column}) 
        VALUES (?, 1)
        ON CONFLICT(pokemon_id) DO UPDATE SET ${column} = ${column} + 1
    `;

    db.run(query, [pokemonId], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, pokemonId, voteType });
    });
});

// GET /api/leaderboard
app.get('/api/leaderboard', (req, res) => {
    const query = `
        SELECT pokemon_id, upvotes, downvotes 
        FROM votes 
        WHERE upvotes > downvotes
        ORDER BY upvotes DESC 
        LIMIT 25
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});
// GET /api/loserboard
app.get('/api/loserboard', (req, res) => {
    const query = `
        SELECT pokemon_id, upvotes, downvotes 
        FROM votes 
        WHERE downvotes > upvotes
        ORDER BY downvotes DESC 
        LIMIT 25
    `;
    
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows || []);
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});