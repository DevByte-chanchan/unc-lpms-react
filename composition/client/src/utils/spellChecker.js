import nspell from 'nspell';
import affData from '../../node_modules/dictionary-en/index.aff?raw';
import dicData from '../../node_modules/dictionary-en/index.dic?raw';

const SESSION_WHITELIST_STORAGE_KEY = 'lpms_spellcheck_session_whitelist_v1';

// Pre-seeded academic, computing, and institution domain terms so valid curriculum terms aren't false-flagged
const DEFAULT_WHITELIST = new Set([
    'unc',
    'lpms',
    'vmo',
    'obe',
    'ilo',
    'ilos',
    'tla',
    'tlas',
    'co',
    'cos',
    'tos',
    'cilo',
    'cilos',
    'pilo',
    'pilos',
    'ched',
    'cmo',
    'vpaa',
    'dean',
    'rubric',
    'rubrics',
    'subtopic',
    'subtopics',
    'courseware',
    'asynchronous',
    'synchronous',
    'pre-class',
    'in-class',
    'post-class',
    'preclass',
    'inclass',
    'postclass',
    'hands-on',
    'handson',
    'wireframe',
    'wireframes',
    'wireframing',
    'mockup',
    'mockups',
    'prototyping',
    'ideation',
    'frontend',
    'backend',
    'fullstack',
    'full-stack',
    'microservice',
    'microservices',
    'virtualization',
    'containerization',
    'cybersecurity',
    'cryptography',
    'blockchain',
    'devops',
    'devsecops',
    'api',
    'apis',
    'rest',
    'restful',
    'graphql',
    'json',
    'xml',
    'yaml',
    'html',
    'css',
    'sass',
    'scss',
    'javascript',
    'typescript',
    'nodejs',
    'reactjs',
    'vuejs',
    'angularjs',
    'nextjs',
    'python',
    'java',
    'kotlin',
    'swift',
    'csharp',
    'golang',
    'rust',
    'php',
    'laravel',
    'django',
    'flask',
    'fastapi',
    'mysql',
    'postgresql',
    'postgres',
    'mongodb',
    'nosql',
    'sqlite',
    'sequelize',
    'prisma',
    'docker',
    'kubernetes',
    'aws',
    'azure',
    'gcp',
    'firebase',
    'supabase',
    'linux',
    'ubuntu',
    'bash',
    'powershell',
    'git',
    'github',
    'gitlab',
    'bitbucket',
    'agile',
    'scrum',
    'kanban',
    'pseudocode',
    'refactoring',
    'debugging',
    'ide',
    'ides',
    'webstorm',
    'vscode',
    'figma',
    'canva',
    'moodle',
    'canvas',
    'blackboard',
    'google',
    'gemini',
    'openai',
    'chatgpt',
    'llm',
    'llms',
    'ai',
    'ml',
    'dl',
    'nlp',
    'hci',
    'ui',
    'ux',
    'ui/ux',
    'isbn',
    'issn',
    'doi',
    'url',
    'urls',
    'http',
    'https',
    'www',
    'pdf',
    'docx',
    'pptx',
    'xlsx',
    'csv',
    'et',
    'al',
    'ed',
    'eds',
    'vol',
    'pp',
    'eg',
    'ie',
    'etc',
    'vs',
    'bicol',
    'naga',
    'caceres',
    'philippines',
    'filipino',
    'monica',
    'norton',
    'olivia',
    'vance',
    'maria',
    'santos',
    'roberto',
    'cruz',
    'sophia',
    'sterling',
    'carlos',
    'garcia',
    'juan',
    'dela',
    'elena',
    'reyes',
    'marco',
    'villanueva'
]);

let spellInstance = null;
const sessionWhitelist = new Set();
const whitelistListeners = new Set();

function loadSessionWhitelist() {
    try {
        const raw = sessionStorage.getItem(SESSION_WHITELIST_STORAGE_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
                parsed.forEach(w => {
                    if (typeof w === 'string' && w.trim()) {
                        sessionWhitelist.add(w.trim().toLowerCase());
                    }
                });
            }
        }
    } catch {
        // Ignore storage errors
    }
}

function saveSessionWhitelist() {
    try {
        sessionStorage.setItem(
            SESSION_WHITELIST_STORAGE_KEY,
            JSON.stringify(Array.from(sessionWhitelist))
        );
    } catch {
        // Ignore storage errors
    }
}

loadSessionWhitelist();

export function getSpellChecker() {
    if (!spellInstance) {
        spellInstance = nspell(affData, dicData);
        DEFAULT_WHITELIST.forEach(word => {
            spellInstance.add(word);
        });
        sessionWhitelist.forEach(word => {
            spellInstance.add(word);
        });
    }
    return spellInstance;
}

export function subscribeWhitelist(listener) {
    whitelistListeners.add(listener);
    return () => whitelistListeners.delete(listener);
}

function notifyWhitelistListeners() {
    whitelistListeners.forEach(listener => {
        try {
            listener();
        } catch {
            // Ignore listener errors
        }
    });
}

/**
 * Adds a word to the custom session whitelist so it won't be flagged again.
 * @param {string} word
 */
export function addToWhitelist(word) {
    if (!word || typeof word !== 'string') return;
    const cleaned = cleanWordToken(word);
    if (!cleaned) return;
    const lower = cleaned.toLowerCase();
    sessionWhitelist.add(lower);
    const checker = getSpellChecker();
    checker.add(cleaned);
    checker.add(lower);
    saveSessionWhitelist();
    notifyWhitelistListeners();
}

export function isWhitelisted(word) {
    if (!word) return true;
    const lower = word.toLowerCase();
    return DEFAULT_WHITELIST.has(lower) || sessionWhitelist.has(lower);
}

/**
 * Strips leading/trailing punctuation or quotes from a candidate token.
 * @param {string} raw
 */
export function cleanWordToken(raw) {
    if (!raw || typeof raw !== 'string') return '';
    return raw.replace(/^[^A-Za-z0-9]+|[^A-Za-z0-9]+$/g, '');
}

const URL_OR_EMAIL_REGEX = /^(https?:\/\/|www\.|ftp:\/\/|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}|[a-zA-Z0-9-]+\.(com|org|edu|net|gov|io|ph|co|uk|us|dev|app)(\/|$))/i;

/**
 * Determines whether a token should be skipped (numbers, URLs, emails, capitalized acronyms, single letters, or whitelisted).
 * @param {string} word
 * @param {string} [surroundingToken]
 */
export function shouldSkipWord(word, surroundingToken = '') {
    if (!word || word.length <= 1) return true;

    // Skip URLs or emails
    if (surroundingToken && URL_OR_EMAIL_REGEX.test(surroundingToken)) return true;
    if (URL_OR_EMAIL_REGEX.test(word)) return true;

    // Skip pure numbers, ordinals (1st, 2nd, 3rd, 4th), percentages, or alphanumeric codes with digits (e.g., BIT311L, CO1, ILO2, 3D, v2)
    if (/\d/.test(word)) return true;

    // Skip ALL-CAPS acronyms (2+ uppercase letters, optionally with periods/hyphens, e.g., "HCI", "OBE", "TLA", "ILO", "VMO", "AI")
    if (/^[A-Z]{2,}(?:['’]?s)?$/.test(word)) return true;

    // Skip camelCase / PascalCase technical identifiers (e.g., JavaScript, PowerPoint, GitHub, MongoDB, useState)
    if (/^[A-Za-z]+[a-z][A-Z][A-Za-z]*$/.test(word)) return true;

    // Skip whitelisted words
    if (isWhitelisted(word)) return true;

    // If stripped of possessive 's, check whitelist or acronym
    const withoutPossessive = word.replace(/['’]s$/i, '');
    if (withoutPossessive !== word) {
        if (/^[A-Z]{2,}$/.test(withoutPossessive)) return true;
        if (isWhitelisted(withoutPossessive)) return true;
    }

    return false;
}

/**
 * Checks whether a single word is spelled correctly.
 * @param {string} rawWord
 * @param {string} [surroundingToken]
 * @returns {boolean} true if valid or skipped, false if misspelled
 */
export function checkWordSpelling(rawWord, surroundingToken = '') {
    const word = cleanWordToken(rawWord);
    if (shouldSkipWord(word, surroundingToken)) return true;

    const checker = getSpellChecker();

    // Direct check
    if (checker.correct(word)) return true;
    if (checker.correct(word.toLowerCase())) return true;

    // Normalize curly apostrophes to straight apostrophe
    const normalized = word.replace(/’/g, "'");
    if (checker.correct(normalized) || checker.correct(normalized.toLowerCase())) {
        return true;
    }

    // Check possessive form (e.g., "student's", "instructor's")
    if (/['’]s$/i.test(normalized)) {
        const base = normalized.replace(/['’]s$/i, '');
        if (shouldSkipWord(base, surroundingToken) || checker.correct(base) || checker.correct(base.toLowerCase())) {
            return true;
        }
    }

    // Check hyphenated compound words (valid if every part is valid)
    if (normalized.includes('-')) {
        const parts = normalized.split('-').filter(Boolean);
        if (parts.length > 1 && parts.every(part => checkWordSpelling(part, surroundingToken))) {
            return true;
        }
    }

    return false;
}

/**
 * Returns spelling suggestions for a misspelled word using nspell.suggest(word).
 * @param {string} rawWord
 * @param {number} [limit=6]
 * @returns {string[]}
 */
export function getSuggestions(rawWord, limit = 6) {
    const word = cleanWordToken(rawWord);
    if (!word) return [];
    const checker = getSpellChecker();
    const normalized = word.replace(/’/g, "'");
    const suggestions = checker.suggest(normalized) || [];
    return suggestions.slice(0, limit);
}

/**
 * Tokenizes a text string into segments of text and words, identifying misspelled words.
 * Word boundaries: spaces and punctuation.
 * If `activeCursorIndex` is provided and the user is currently mid-typing at the very end of a word
 * without a trailing word boundary, that active word can optionally be deferred until a boundary or blur.
 *
 * @param {string} text
 * @param {object} [options]
 * @param {boolean} [options.requireBoundaryAtEnd=false] - If true, a word at the very end of the string with no trailing space/punctuation is not flagged until a boundary is typed or field blurs.
 * @param {number|null} [options.activeCursorIndex=null] - Current caret offset if focused.
 * @returns {Array<{ text: string, start: number, end: number, isWord: boolean, isMisspelled: boolean, cleanWord: string }>}
 */
export function tokenizeAndCheckText(text, options = {}) {
    if (!text || typeof text !== 'string') return [];

    const { requireBoundaryAtEnd = false, activeCursorIndex = null } = options;

    // Match non-whitespace chunks first so we can detect URLs/emails before splitting words
    const tokens = [];
    // Regex matches word tokens (letters/numbers with internal apostrophes/hyphens) or non-word characters
    const wordRegex = /[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g;

    // Pre-identify URL / email spans so words inside URLs are skipped
    const urlSpans = [];
    const nonSpaceRegex = /\S+/g;
    let nsMatch;
    while ((nsMatch = nonSpaceRegex.exec(text)) !== null) {
        const chunk = nsMatch[0].replace(/[.,;:!?)]+$/, '');
        if (URL_OR_EMAIL_REGEX.test(chunk)) {
            urlSpans.push({
                start: nsMatch.index,
                end: nsMatch.index + chunk.length
            });
        }
    }

    const isInsideUrl = (start, end) =>
        urlSpans.some(span => start >= span.start && end <= span.end);

    let lastIndex = 0;
    let match;

    while ((match = wordRegex.exec(text)) !== null) {
        const start = match.index;
        const wordText = match[0];
        const end = start + wordText.length;

        if (start > lastIndex) {
            tokens.push({
                text: text.slice(lastIndex, start),
                start: lastIndex,
                end: start,
                isWord: false,
                isMisspelled: false,
                cleanWord: ''
            });
        }

        const atVeryEnd = end === text.length;
        const caretInsideOrAtWordEnd =
            activeCursorIndex != null && activeCursorIndex >= start && activeCursorIndex <= end;

        let isMisspelled = false;
        if (!isInsideUrl(start, end)) {
            if (requireBoundaryAtEnd && atVeryEnd && caretInsideOrAtWordEnd) {
                isMisspelled = false;
            } else {
                isMisspelled = !checkWordSpelling(wordText);
            }
        }

        tokens.push({
            text: wordText,
            start,
            end,
            isWord: true,
            isMisspelled,
            cleanWord: cleanWordToken(wordText)
        });

        lastIndex = end;
    }

    if (lastIndex < text.length) {
        tokens.push({
            text: text.slice(lastIndex),
            start: lastIndex,
            end: text.length,
            isWord: false,
            isMisspelled: false,
            cleanWord: ''
        });
    }

    return tokens;
}

/**
 * Checks a text string and returns an array of unique misspelled words in order of appearance.
 * @param {string} text
 * @returns {string[]}
 */
export function checkSpelling(text) {
    if (!text || typeof text !== 'string') return [];
    const tokens = tokenizeAndCheckText(text, { requireBoundaryAtEnd: false });
    const seen = new Set();
    const misspelled = [];

    for (const token of tokens) {
        if (token.isWord && token.isMisspelled) {
            const key = token.cleanWord.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                misspelled.push(token.cleanWord);
            }
        }
    }

    return misspelled;
}
