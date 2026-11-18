// db connect file for graphics control system
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { XMLParser } = require('fast-xml-parser');
const multer = require('multer');
let db;

const lyricsDataDir = path.resolve(__dirname, '../public/plugin/lyrics/data');

const uploadDir = path.resolve(__dirname, '../public/uploads');
const fontDir = path.resolve(__dirname, '../public/fonts');
fs.mkdirSync(uploadDir, { recursive: true });
fs.mkdirSync(fontDir, { recursive: true });

const uploadStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
        cb(null, `${Date.now()}-${safeName}`);
    }
});

const fontStorage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, fontDir),
    filename: (_req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
        cb(null, `${Date.now()}-${safeName}`);
    }
});

const mediaUpload = multer({
    storage: uploadStorage,
    limits: { fileSize: 50 * 1024 * 1024 }
});

const fontUpload = multer({
    storage: fontStorage,
    limits: { fileSize: 20 * 1024 * 1024 }
});

function detectMediaType(fileName, mimeType = '') {
    const lowerName = String(fileName || '').toLowerCase();
    const lowerMime = String(mimeType || '').toLowerCase();
    if (lowerMime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(lowerName)) return 'image';
    if (lowerMime.startsWith('video/') || /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(lowerName)) return 'video';
    return 'file';
}

function listFiles(directory) {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory, { withFileTypes: true })
        .filter(entry => entry.isFile())
        .map(entry => entry.name)
        .sort((a, b) => a.localeCompare(b));
}

function getBuiltinFontList() {
    const builtin = [
        { family: 'Amhara', name: 'Amhara', url: '/fonts/Amhara_reduced.otf', format: 'opentype', isBuiltin: true },
        { family: 'Agbalumo', name: 'Agbalumo', url: '/fonts/Agbalumo_Regular.ttf', format: 'truetype', isBuiltin: true },
        { family: 'BelaBreka', name: 'BelaBreka', url: '/fonts/Bela_Bereka.ttf', format: 'truetype', isBuiltin: true },
        { family: 'Benaiah', name: 'Benaiah', url: '/fonts/Benaiah.ttf', format: 'truetype', isBuiltin: true },
        { family: 'Bebas Neue', name: 'Bebas Neue', url: '/fonts/BebasNeue-Regular.ttf', format: 'truetype', isBuiltin: true }
    ];
    return builtin;
}

function parseSongTitleGroups(filePath) {
    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        const parsed = JSON.parse(raw);
        const groups = Array.isArray(parsed) ? parsed : [parsed];
        const items = groups
            .filter(group => group && Array.isArray(group.item))
            .map(group => group.item);

        if (!items.length) return { titles: [], subtitles: [] };

        const titles = Array.isArray(items[0]) ? items[0] : [];
        const subtitles = items.length > 1 && Array.isArray(items[1]) ? items[1] : [];
        return { titles, subtitles };
    } catch (err) {
        console.error(`Failed to parse song titles: ${filePath}`, err.message);
        return { titles: [], subtitles: [] };
    }
}

function normalizeSongLines(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value.map(v => String(v ?? '').trim()).filter(Boolean);
    if (typeof value === 'object') {
        const arr = Array.isArray(value._text) ? value._text : [value._text || value];
        return arr.map(v => String(v ?? '').trim()).filter(Boolean);
    }
    return [String(value).trim()].filter(Boolean);
}

function extractSongPages(songNode) {
    if (!songNode) return [];
    const pages = Array.isArray(songNode.page) ? songNode.page : (songNode.page ? [songNode.page] : []);
    return pages.map((page) => {
        const lines = normalizeSongLines(page?.line);
        return lines.join('\n');
    }).filter(Boolean);
}

function importSongDirectory(directoryPath, sourceName) {
    const titlePath = path.join(directoryPath, 'title.json');
    const xmlPath = path.join(directoryPath, 'song_file.xml');
    if (!fs.existsSync(titlePath) || !fs.existsSync(xmlPath)) return;

    const { titles, subtitles } = parseSongTitleGroups(titlePath);
    const xml = fs.readFileSync(xmlPath, 'utf8');
    const parser = new XMLParser({ ignoreAttributes: false, trimValues: false, parseTagValue: false });
    const parsed = parser.parse(xml);
    const items = parsed?.resources?.['string-array']?.item ?? parsed?.resources?.['string-array']?.['item'] ?? [];
    const songs = Array.isArray(items) ? items : [items];

    const insertStmt = db.prepare(`
        INSERT OR IGNORE INTO songs (source, title, subtitle, lyrics, page_count, source_file)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    const updateSubtitleStmt = db.prepare(`
        UPDATE songs SET subtitle = ? WHERE source = ? AND title = ?
    `);

    songs.forEach((songNode, index) => {
        const title = (titles[index] || `Untitled ${index + 1}`).trim();
        const subtitle = (subtitles[index] || '').trim();
        if (!title) return;

        const pages = extractSongPages(songNode);
        const lyrics = pages.join('\n\n');
        insertStmt.run(sourceName, title, subtitle, lyrics || '', pages.length, `${sourceName}/${path.basename(xmlPath)}`);
        if (subtitle) {
            updateSubtitleStmt.run(subtitle, sourceName, title);
        }
    });
}

function db_connect(){
    try {
        // Create/open a database file (creates if doesn't exist)
        db = new Database('mydatabase.db');

        // Optional: Enable WAL mode for better concurrent performance
        db.pragma('journal_mode = WAL');

        console.log('Connected to the SQLite database.');
    } catch (error) {
        console.error('Error connecting to the database:', error.message);
    }
}

function findDuplicateSong(source, title, ignoreId = null) {
    if (!source || !title) return null;
    const sql = ignoreId === null
        ? `SELECT id FROM songs WHERE source = ? AND title = ? LIMIT 1`
        : `SELECT id FROM songs WHERE source = ? AND title = ? AND id != ? LIMIT 1`;
    const params = ignoreId === null ? [source, title] : [source, title, ignoreId];
    return db.prepare(sql).get(...params) || null;
}

// create tables
function create_tables(){
    db.exec(`CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT,
        firebase_uid TEXT UNIQUE, 
        username TEXT UNIQUE,
        full_name TEXT,
        password TEXT,
        role TEXT DEFAULT 'operator'
    )`);

    db.exec(`CREATE TABLE IF NOT EXISTS bible_verses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        translation TEXT,
        testament TEXT,
        book INTEGER,
        chapter INTEGER,
        verse INTEGER,
        text TEXT,
        UNIQUE(translation, testament, book, chapter, verse)
    )`);

    db.exec(`CREATE TABLE IF NOT EXISTS presentation_properties (
        type TEXT PRIMARY KEY,
        properties TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

    db.exec(`CREATE INDEX IF NOT EXISTS idx_bible_book_chapter
        ON bible_verses (translation, book, chapter)`);

    db.exec(`CREATE TABLE IF NOT EXISTS songs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source TEXT,
        title TEXT NOT NULL,
        subtitle TEXT,
        lyrics TEXT,
        page_count INTEGER DEFAULT 0,
        sort_order INTEGER,
        source_file TEXT,
        UNIQUE(source, title)
    )`);

    const songInfo = db.prepare(`PRAGMA table_info(songs)`).all();
    const hasSubtitle = songInfo.some(column => column.name === 'subtitle');
    if (!hasSubtitle) {
        db.exec(`ALTER TABLE songs ADD COLUMN subtitle TEXT`);
    }
    const hasSortOrder = songInfo.some(column => column.name === 'sort_order');
    if (!hasSortOrder) {
        db.exec(`ALTER TABLE songs ADD COLUMN sort_order INTEGER`);
        db.exec(`
            UPDATE songs
            SET sort_order = (
                SELECT COUNT(*) - 1
                FROM songs AS earlier
                WHERE earlier.source = songs.source AND earlier.id <= songs.id
            )
        `);
    }

    db.exec(`CREATE INDEX IF NOT EXISTS idx_songs_source_title
        ON songs (source, title)`);

    db.exec(`CREATE TABLE IF NOT EXISTS playlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        source_key TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL
    )`);

    const playlistCount = db.prepare(`SELECT count(*) as count FROM playlists`).get();
    if (!playlistCount || playlistCount.count === 0) {
        const insertPlaylist = db.prepare(`INSERT OR IGNORE INTO playlists (source_key, name) VALUES (?, ?)`);
        insertPlaylist.run('hymnal', 'ሃይማኖት / Local Songs');
        insertPlaylist.run('localSongs', 'Local Songs');
    }
}

function seed_song_library() {
    if (!fs.existsSync(lyricsDataDir)) return;

    const dirEntries = fs.readdirSync(lyricsDataDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .sort();

    dirEntries.forEach((dirName) => {
        const folderPath = path.join(lyricsDataDir, dirName);
        importSongDirectory(folderPath, dirName);
    });
}

module.exports = function(app) {

    // Add middleware to parse JSON request bodies
    const express = require('express');
    app.use('/uploads', express.static(uploadDir));
    app.use('/fonts', express.static(fontDir));
    app.use(express.json({ limit: '200mb' }));
    app.use(express.urlencoded({ extended: true, limit: '200mb' }));

    // Connect and create tables
    db_connect();
    create_tables();
    seed_song_library();

    // ── Bible API Routes ──────────────────────────────────────────

    // GET /api/bible/translations
    app.get('/api/bible/translations', (req, res) => {
        try {
            const rows = db.prepare(
                `SELECT DISTINCT translation FROM bible_verses ORDER BY translation`
            ).all();
            res.json(rows.map(r => r.translation));
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // GET /api/bible/chapters?translation=&book=
    app.get('/api/bible/chapters', (req, res) => {
        const { translation, book } = req.query;
        if (!translation || !book)
            return res.status(400).json({ error: 'translation and book required' });
        try {
            const row = db.prepare(
                `SELECT MAX(chapter) as total FROM bible_verses WHERE translation = ? AND book = ?`
            ).get(translation, parseInt(book));
            res.json({ total: row?.total ?? 0 });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // GET /api/bible/verses?translation=&book=&chapter=
    app.get('/api/bible/verses', (req, res) => {
        const { translation, book, chapter } = req.query;
        if (!translation || !book || !chapter)
            return res.status(400).json({ error: 'translation, book and chapter required' });
        try {
            const rows = db.prepare(
                `SELECT verse, text FROM bible_verses
                 WHERE translation = ? AND book = ? AND chapter = ?
                 ORDER BY verse`
            ).all(translation, parseInt(book), parseInt(chapter));
            res.json(rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // GET /api/bible/verse?translation=&book=&chapter=&verse=
    app.get('/api/bible/verse', (req, res) => {
        const { translation, book, chapter, verse } = req.query;
        if (!translation || !book || !chapter || !verse)
            return res.status(400).json({ error: 'translation, book, chapter and verse required' });
        try {
            const row = db.prepare(
                `SELECT verse, text, testament FROM bible_verses
                 WHERE translation = ? AND book = ? AND chapter = ? AND verse = ?`
            ).get(translation, parseInt(book), parseInt(chapter), parseInt(verse));
            if (!row) return res.status(404).json({ error: 'Verse not found' });
            res.json(row);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // GET /api/bible/search?translation=&q=
    app.get('/api/bible/search', (req, res) => {
        const { translation, q } = req.query;
        if (!translation || !q)
            return res.status(400).json({ error: 'translation and q required' });
        try {
            const rows = db.prepare(
                `SELECT book, chapter, verse, text, testament FROM bible_verses
                 WHERE translation = ? AND text LIKE ?
                 ORDER BY book, chapter, verse LIMIT 100`
            ).all(translation, `%${q}%`);
            res.json(rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    // ── Song library routes ──────────────────────────────────────
    app.get('/api/lyrics/songs', (req, res) => {
        try {
            const { q, source, sort = 'order' } = req.query;
            let sql = `SELECT id, source, title, subtitle, lyrics, page_count, source_file FROM songs`;
            const params = [];
            if (source) {
                sql += ` WHERE source = ?`;
                params.push(source);
            }
            if (q) {
                sql += (params.length ? ' AND (' : ' WHERE (') + `title LIKE ? OR subtitle LIKE ? OR lyrics LIKE ?)`;
                params.push(`%${q}%`, `%${q}%`, `%${q}%`);
            }
            sql += (sort === 'alpha')
                ? ` ORDER BY title COLLATE NOCASE, id`
                : ` ORDER BY CASE WHEN sort_order IS NULL THEN 1 ELSE 0 END, sort_order, id`;
            const rows = db.prepare(sql).all(...params);
            res.json(rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.get('/api/lyrics/song/:id', (req, res) => {
        try {
            const row = db.prepare(`SELECT * FROM songs WHERE id = ?`).get(Number(req.params.id));
            if (!row) return res.status(404).json({ error: 'Song not found' });
            res.json(row);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    const updateSongHandler = (req, res) => {
        try {
            const id = Number(req.params.id);
            const { title, subtitle, lyrics } = req.body;
            if (!title || !String(title).trim()) {
                return res.status(400).json({ error: 'Song title cannot be empty' });
            }
            const cleanTitle = String(title).trim();
            const cleanSubtitle = subtitle !== undefined ? String(subtitle).trim() : null;
            const cleanLyrics = lyrics !== undefined ? String(lyrics).replace(/\r\n?/g, '\n').trim() : null;
            if (lyrics !== undefined && !cleanLyrics) {
                return res.status(400).json({ error: 'Song lyrics cannot be empty' });
            }

            const existingSong = db.prepare(`SELECT source FROM songs WHERE id = ?`).get(id);
            if (!existingSong) {
                return res.status(404).json({ error: 'Song not found' });
            }
            const duplicateSong = findDuplicateSong(existingSong.source, cleanTitle, id);
            if (duplicateSong) {
                return res.status(409).json({ error: 'A song with this title already exists in this playlist' });
            }

            const updateStmt = cleanLyrics === null
                ? db.prepare(`UPDATE songs SET title = ?, subtitle = ? WHERE id = ?`)
                : db.prepare(`UPDATE songs SET title = ?, subtitle = ?, lyrics = ?, page_count = ? WHERE id = ?`);
            const info = cleanLyrics === null
                ? updateStmt.run(cleanTitle, cleanSubtitle, id)
                : updateStmt.run(cleanTitle, cleanSubtitle, cleanLyrics, cleanLyrics.split(/\n\s*\n+/).filter(Boolean).length, id);
            if (info.changes === 0) {
                return res.status(404).json({ error: 'Song not found' });
            }

            const updated = db.prepare(`SELECT * FROM songs WHERE id = ?`).get(id);
            res.json({ success: true, song: updated });
        } catch (err) {
            if (err.code && String(err.code).includes('CONSTRAINT')) {
                return res.status(409).json({ error: 'A song with this title already exists in this playlist' });
            }
            res.status(500).json({ error: err.message });
        }
    };
    app.put('/api/lyrics/song/:id', updateSongHandler);
    app.post('/api/lyrics/song/:id', updateSongHandler);

    app.delete('/api/lyrics/song/:id', (req, res) => {
        try {
            const id = Number(req.params.id);
            if (!Number.isInteger(id) || id < 1) {
                return res.status(400).json({ error: 'A valid song id is required' });
            }
            const result = db.prepare(`DELETE FROM songs WHERE id = ?`).run(id);
            if (result.changes === 0) return res.status(404).json({ error: 'Song not found' });
            res.json({ success: true });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.put('/api/lyrics/playlist/:source/song-order', (req, res) => {
        try {
            const source = String(req.params.source || '').trim();
            const songIds = req.body?.songIds;
            if (!source || !db.prepare(`SELECT 1 FROM playlists WHERE source_key = ?`).get(source)) {
                return res.status(404).json({ error: 'Playlist not found' });
            }
            if (!Array.isArray(songIds) || songIds.some(id => !Number.isSafeInteger(id) || id < 1) ||
                new Set(songIds).size !== songIds.length) {
                return res.status(400).json({ error: 'A unique ordered list of song ids is required' });
            }

            const playlistSongIds = db.prepare(`SELECT id FROM songs WHERE source = ?`).all(source)
                .map(song => song.id);
            const requestedSongIds = new Set(songIds);
            if (playlistSongIds.length !== songIds.length ||
                playlistSongIds.some(id => !requestedSongIds.has(id))) {
                return res.status(400).json({ error: 'The song order must include every song in this playlist exactly once' });
            }

            const saveOrder = db.transaction(() => {
                const updateOrder = db.prepare(`UPDATE songs SET sort_order = ? WHERE id = ? AND source = ?`);
                songIds.forEach((id, index) => updateOrder.run(index, id, source));
            });
            saveOrder();
            res.json({ success: true, source, count: songIds.length });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.delete('/api/lyrics/playlist/:source/songs', (req, res) => {
        try {
            const source = String(req.params.source || '').trim();
            if (!source) return res.status(400).json({ error: 'A playlist is required' });
            const playlist = db.prepare(`SELECT source_key FROM playlists WHERE source_key = ?`).get(source);
            if (!playlist) return res.status(404).json({ error: 'Playlist not found' });

            const deleteSongs = db.transaction(() => {
                const result = db.prepare(`DELETE FROM songs WHERE source = ?`).run(source);
                return result.changes;
            });
            const deletedCount = deleteSongs();
            res.json({ success: true, source, deletedCount });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.get('/api/lyrics/playlists', (_req, res) => {
        try {
            const rows = db.prepare(`SELECT source_key, name FROM playlists ORDER BY id`).all();
            res.json(rows);
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    const renamePlaylistHandler = (req, res) => {
        try {
            const { currentSource, newName } = req.body;
            const targetName = (newName || '').trim();
            if (!currentSource || !String(currentSource).trim()) {
                return res.status(400).json({ error: 'currentSource is required' });
            }
            if (!targetName) {
                return res.status(400).json({ error: 'Playlist name cannot be empty' });
            }

            const cleanSource = String(currentSource).trim();

            const updateStmt = db.prepare(`UPDATE playlists SET name = ? WHERE source_key = ?`);
            const info = updateStmt.run(targetName, cleanSource);

            if (info.changes === 0) {
                const insertStmt = db.prepare(`INSERT OR REPLACE INTO playlists (source_key, name) VALUES (?, ?)`);
                insertStmt.run(cleanSource, targetName);
            }

            const updatedPlaylists = db.prepare(`SELECT source_key, name FROM playlists ORDER BY id`).all();

            res.json({
                success: true,
                source_key: cleanSource,
                name: targetName,
                playlists: updatedPlaylists
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    };
    app.put('/api/lyrics/playlist/rename', renamePlaylistHandler);
    app.post('/api/lyrics/playlist/rename', renamePlaylistHandler);

    app.post('/api/lyrics/playlist', (req, res) => {
        try {
            const name = String(req.body?.name || '').trim();
            if (!name) return res.status(400).json({ error: 'Playlist name is required' });

            const baseKey = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'playlist';
            let sourceKey = baseKey;
            let suffix = 2;
            while (db.prepare(`SELECT 1 FROM playlists WHERE source_key = ?`).get(sourceKey)) {
                sourceKey = `${baseKey}-${suffix++}`;
            }
            db.prepare(`INSERT INTO playlists (source_key, name) VALUES (?, ?)` ).run(sourceKey, name);
            const playlists = db.prepare(`SELECT source_key, name FROM playlists ORDER BY id`).all();
            res.status(201).json({ success: true, playlist: { source_key: sourceKey, name }, playlists });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/lyrics/playlist/import', (req, res) => {
        try {
            const name = String(req.body?.name || '').trim();
            const incomingSongs = req.body?.songs;
            if (!name) return res.status(400).json({ error: 'Playlist name is required' });
            if (!Array.isArray(incomingSongs)) return res.status(400).json({ error: 'Playlist songs must be an array' });
            if (incomingSongs.length > 10000) return res.status(400).json({ error: 'Playlist contains too many songs' });

            const songs = incomingSongs.map((song, index) => ({
                title: String(song?.title || '').trim(),
                subtitle: String(song?.subtitle || '').trim(),
                lyrics: String(song?.lyrics || '').replace(/\r\n?/g, '\n').trim(),
                index
            }));
            const seenTitles = new Set();
            for (const song of songs) {
                if (!song.title || !song.lyrics) {
                    return res.status(400).json({ error: `Song ${song.index + 1} must include a title and lyrics` });
                }
                const normalizedTitle = song.title.toLocaleLowerCase();
                if (seenTitles.has(normalizedTitle)) {
                    return res.status(409).json({ error: `Playlist contains duplicate song title: ${song.title}` });
                }
                seenTitles.add(normalizedTitle);
            }

            const importPlaylist = db.transaction(() => {
                const baseKey = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'playlist';
                let sourceKey = baseKey;
                let suffix = 2;
                while (db.prepare(`SELECT 1 FROM playlists WHERE source_key = ?`).get(sourceKey)) {
                    sourceKey = `${baseKey}-${suffix++}`;
                }

                db.prepare(`INSERT INTO playlists (source_key, name) VALUES (?, ?)`).run(sourceKey, name);
                const insertSong = db.prepare(`
                    INSERT INTO songs (source, title, subtitle, lyrics, page_count, source_file)
                    VALUES (?, ?, ?, ?, ?, ?)
                `);
                for (const song of songs) {
                    const pageCount = song.lyrics.split(/\n\s*\n+/).filter(Boolean).length;
                    insertSong.run(sourceKey, song.title, song.subtitle || null, song.lyrics, pageCount, 'playlist-json');
                }
                return { source_key: sourceKey, name };
            });

            const playlist = importPlaylist();
            const playlists = db.prepare(`SELECT source_key, name FROM playlists ORDER BY id`).all();
            res.status(201).json({ success: true, playlist, playlists, importedCount: songs.length });
        } catch (err) {
            if (err.code && String(err.code).includes('CONSTRAINT')) {
                return res.status(409).json({ error: 'Playlist could not be imported because it contains conflicting data' });
            }
            res.status(500).json({ error: err.message });
        }
    });

    app.post('/api/lyrics/songs', (req, res) => {
        try {
            const source = String(req.body?.source || '').trim();
            const title = String(req.body?.title || '').trim();
            const subtitle = String(req.body?.subtitle || '').trim();
            const lyrics = String(req.body?.lyrics || '').replace(/\r\n?/g, '\n').trim();
            if (!source || !db.prepare(`SELECT 1 FROM playlists WHERE source_key = ?`).get(source)) {
                return res.status(400).json({ error: 'Please choose a valid playlist' });
            }
            if (!title || !lyrics) return res.status(400).json({ error: 'Song title and lyrics are required' });
            if (findDuplicateSong(source, title)) {
                return res.status(409).json({ error: 'A song with this title already exists in this playlist' });
            }
            const pageCount = lyrics.split(/\n\s*\n+/).filter(Boolean).length;
            const result = db.prepare(`INSERT INTO songs (source, title, subtitle, lyrics, page_count, source_file) VALUES (?, ?, ?, ?, ?, ?)`)
                .run(source, title, subtitle || null, lyrics, pageCount, 'manual');
            const song = db.prepare(`SELECT * FROM songs WHERE id = ?`).get(result.lastInsertRowid);
            res.status(201).json({ success: true, song });
        } catch (err) {
            if (err.code && String(err.code).includes('CONSTRAINT')) {
                return res.status(409).json({ error: 'A song with this title already exists in this playlist' });
            }
            res.status(500).json({ error: err.message });
        }
    });

    // ── Media registry for image/video background uploads ─────────
    const getUploadsHandler = (_req, res) => {
        const files = listFiles(uploadDir).map(name => {
            const type = detectMediaType(name, '');
            return {
                name,
                type,
                url: `/uploads/${encodeURIComponent(name)}`
            };
        });
        res.json(files);
    };

    const postUploadHandler = (req, res) => {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No file uploaded.' });
        }

        const file = {
            name: req.file.originalname,
            filename: req.file.filename,
            type: detectMediaType(req.file.originalname, req.file.mimetype),
            url: `/uploads/${encodeURIComponent(req.file.filename)}`
        };

        res.json({ success: true, file });
    };

    const deleteUploadHandler = (req, res) => {
        const fileName = decodeURIComponent(req.params.name);
        const target = path.join(uploadDir, fileName);
        if (!fs.existsSync(target)) {
            return res.status(404).json({ success: false, error: 'File not found.' });
        }
        fs.unlinkSync(target);
        res.json({ success: true });
    };

    app.get('/api/bible/uploads', getUploadsHandler);
    app.post('/api/bible/upload', mediaUpload.single('file'), postUploadHandler);
    app.delete('/api/bible/uploads/:name', deleteUploadHandler);

    app.get('/api/lyrics/uploads', getUploadsHandler);
    app.post('/api/lyrics/upload', mediaUpload.single('file'), postUploadHandler);
    app.delete('/api/lyrics/uploads/:name', deleteUploadHandler);

    // ── Fonts for Bible display and property editor ──────────────
    app.get('/api/bible/fonts', (_req, res) => {
        const custom = listFiles(fontDir).map(name => ({
            name: name.replace(/\.[^.]+$/, ''),
            filename: name,
            family: name.replace(/\.[^.]+$/, ''),
            category: 'custom',
            url: `/fonts/${encodeURIComponent(name)}`,
            format: path.extname(name).toLowerCase() === '.otf' ? 'opentype' : 'truetype',
            isCustom: true,
            isBuiltin: false
        }));
        res.json({ builtin: getBuiltinFontList(), custom, web: [] });
    });

    app.post('/api/bible/fonts/upload', fontUpload.single('font'), (req, res) => {
        if (!req.file) {
            return res.status(400).json({ success: false, error: 'No font uploaded.' });
        }

        const font = {
            name: req.file.originalname,
            filename: req.file.filename,
            family: req.file.originalname.replace(/\.[^.]+$/, ''),
            url: `/fonts/${encodeURIComponent(req.file.filename)}`,
            format: path.extname(req.file.originalname).toLowerCase() === '.otf' ? 'opentype' : 'truetype',
            isCustom: true,
            isBuiltin: false
        };

        res.json({ success: true, font });
    });

    app.delete('/api/bible/fonts/:filename', (req, res) => {
        const fileName = decodeURIComponent(req.params.filename);
        const target = path.join(fontDir, fileName);
        if (!fs.existsSync(target)) {
            return res.status(404).json({ success: false, error: 'Font not found.' });
        }
        fs.unlinkSync(target);
        res.json({ success: true });
    });

    const supportedPropertyTypes = new Set(['bible_properties', 'lyrics_properties']);
    return {
        getPresentationProperties() {
            return db.prepare(`SELECT type, properties FROM presentation_properties`).all()
                .filter(row => supportedPropertyTypes.has(row.type))
                .map(row => {
                    try {
                        return { type: row.type, properties: JSON.parse(row.properties) };
                    } catch (error) {
                        console.error(`Failed to parse stored ${row.type}:`, error.message);
                        return null;
                    }
                })
                .filter(Boolean);
        },
        savePresentationProperties(type, properties) {
            if (!supportedPropertyTypes.has(type) || !properties || typeof properties !== 'object' || Array.isArray(properties)) {
                throw new TypeError('Unsupported presentation properties');
            }
            const serialized = JSON.stringify(properties);
            db.prepare(`
                INSERT INTO presentation_properties (type, properties, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(type) DO UPDATE SET
                    properties = excluded.properties,
                    updated_at = CURRENT_TIMESTAMP
            `).run(type, serialized);
        }
    };
}
   
