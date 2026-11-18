/**
 * Bible XML Importer — scans the books directory and imports every .xml file.
 * Safe to re-run: skips translations that are already fully imported,
 * and uses INSERT OR IGNORE so duplicate verses are never doubled.
 *
 * Usage:
 *   node db/import_bible.js              → import all new translations
 *   node db/import_bible.js --force      → re-import every translation
 */

const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

const BOOKS_DIR = path.join(
    __dirname,
    '../public/plugin/bible/data/books'
);
const DB_FILE = path.join(__dirname, '../mydatabase.db');
const FORCE = process.argv.includes('--force');

// ── Setup DB ───────────────────────────────────────────────────────────────
const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');

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

db.exec(`CREATE INDEX IF NOT EXISTS idx_bible_book_chapter
    ON bible_verses (translation, book, chapter)`);

// ── Prepared statements ────────────────────────────────────────────────────
const insert = db.prepare(`
    INSERT OR IGNORE INTO bible_verses (translation, testament, book, chapter, verse, text)
    VALUES (@translation, @testament, @book, @chapter, @verse, @text)
`);

const insertMany = db.transaction((rows) => {
    for (const row of rows) insert.run(row);
});

const countByTranslation = db.prepare(
    `SELECT COUNT(*) as cnt FROM bible_verses WHERE translation = ?`
);

// ── XML parser ─────────────────────────────────────────────────────────────
const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    isArray: (name) => ['testament', 'book', 'chapter', 'verse'].includes(name),
});

// ── Helpers ────────────────────────────────────────────────────────────────
function parseXml(filePath) {
    const xml = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, ''); // strip BOM
    const doc = parser.parse(xml);
    const bible = doc.bible;
    const translation = bible['@_translation'] || path.basename(filePath, '.xml');

    const rows = [];
    for (const testament of (bible.testament || [])) {
        const testamentName = testament['@_name'];
        for (const book of (testament.book || [])) {
            const bookNum = parseInt(book['@_number'], 10);
            for (const chapter of (book.chapter || [])) {
                const chapterNum = parseInt(chapter['@_number'], 10);
                const rawVerses = chapter.verse;
                if (!rawVerses) continue;
                const verses = Array.isArray(rawVerses) ? rawVerses : [rawVerses];
                for (const verse of verses) {
                    rows.push({
                        translation,
                        testament: testamentName,
                        book: bookNum,
                        chapter: chapterNum,
                        verse: parseInt(verse['@_number'], 10),
                        text: (verse['#text'] || '').toString().trim(),
                    });
                }
            }
        }
    }
    return { translation, rows };
}

// ── Main ───────────────────────────────────────────────────────────────────
const xmlFiles = fs.readdirSync(BOOKS_DIR)
    .filter(f => f.toLowerCase().endsWith('.xml'))
    .map(f => path.join(BOOKS_DIR, f));

if (xmlFiles.length === 0) {
    console.log('No XML files found in', BOOKS_DIR);
    process.exit(0);
}

console.log(`Found ${xmlFiles.length} XML file(s) in books directory.\n`);

let totalImported = 0;
let skipped = 0;

for (const file of xmlFiles) {
    const fileName = path.basename(file);
    process.stdout.write(`📖 ${fileName} — parsing...`);

    let translation, rows;
    try {
        ({ translation, rows } = parseXml(file));
    } catch (err) {
        console.log(` ❌ Error: ${err.message}`);
        continue;
    }

    // Check if already imported (unless --force)
    if (!FORCE) {
        const { cnt } = countByTranslation.get(translation);
        if (cnt > 0) {
            console.log(` ⏭  Already imported (${cnt} verses). Use --force to re-import.`);
            skipped++;
            continue;
        }
    }

    insertMany(rows);
    console.log(` ✅ ${rows.length} verses imported. [${translation}]`);
    totalImported += rows.length;
}

console.log(`\n✅ Done! Imported ${totalImported} new verse(s). Skipped ${skipped} translation(s).`);
db.close();
