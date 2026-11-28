'use strict';

const dns = require('dns').promises;
const net = require('net');
const { Op } = require('sequelize');
const db = require('../models');
const { isTextbookType, normalizeReferenceType } = require('../config/referenceTypes');
const {
  getValidGeminiApiKey,
  getGeminiModelCandidates,
  createGeminiClient,
  getProviderCapabilities,
  searchWebJsonWithFallback,
} = require('./aiProviderService');

const USER_AGENT = 'UNC-LPMS-CurriculumGrounder/1.0 (+academic-syllabus-verification)';
const HTTP_TIMEOUT_MS = 8000;
const URL_FETCH_TIMEOUT_MS = 7000;
const MAX_HTML_BYTES = 512 * 1024; // 512 KB cap for safe OER/OR outline extraction
const MAX_REDIRECTS = 3;
const MAX_TOC_CHAPTERS = 60;
const MAX_SECTIONS_PER_CHAPTER = 25;

// ============================================================================
// 2. TOC NORMALIZATION & MANUAL PASTE PARSING
// ============================================================================

function decodeHtmlEntities(str) {
  return String(str || '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;/gi, '–')
    .replace(/&mdash;/gi, '—')
    .replace(/&#(\d+);/g, (_, code) => {
      const n = Number(code);
      return Number.isFinite(n) ? String.fromCharCode(n) : '';
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const n = parseInt(hex, 16);
      return Number.isFinite(n) ? String.fromCharCode(n) : '';
    });
}

function cleanLineText(raw) {
  let text = decodeHtmlEntities(String(raw || ''))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Strip dot leaders and trailing page numbers (e.g. "Foundations ........ 15" or "Foundations   15")
  text = text
    .replace(/\.{2,}\s*\d+\s*$/g, '')
    .replace(/\s{2,}\d{1,4}\s*$/g, '')
    .replace(/\s+p\.?\s*\d+(?:-\d+)?\s*$/i, '')
    .trim();
  return text;
}

const BOILERPLATE_TOC_TITLES = new Set([
  'cover',
  'half title',
  'title page',
  'copyright',
  'copyright page',
  'dedication',
  'contents',
  'table of contents',
  'brief contents',
  'index',
  'subject index',
  'author index',
  'name index',
  'about the author',
  'about the authors',
  'about the reviewers',
  'acknowledgments',
  'acknowledgements',
  'colophon',
  'list of figures',
  'list of tables',
  'foreword',
  'preface',
  'bibliography',
  'references',
  'further reading',
  'skip to content',
  'skip to main content',
  'navigation',
  'menu',
  'search',
  'sign in',
  'log in',
  'cookie settings',
  'privacy policy',
  'related articles',
  'related posts',
  'leave a reply',
  'comments',
]);

function isBoilerplateTitle(title) {
  const lower = String(title || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!lower || lower.length < 2) return true;
  return BOILERPLATE_TOC_TITLES.has(lower);
}

/**
 * Normalizes an arbitrary TOC entries array into canonical:
 *   [{ chapter: string, title: string, sections: string[] }]
 */
function normalizeTocEntries(rawEntries = [], { filterBoilerplate = true } = {}) {
  if (!Array.isArray(rawEntries)) return [];
  const normalized = [];
  const seenKeys = new Set();

  for (let i = 0; i < rawEntries.length && normalized.length < MAX_TOC_CHAPTERS; i++) {
    const item = rawEntries[i];
    if (!item) continue;

    let chapter = '';
    let title = '';
    let rawSections = [];

    if (typeof item === 'string') {
      title = cleanLineText(item);
      chapter = `Chapter ${normalized.length + 1}`;
    } else if (typeof item === 'object') {
      chapter = cleanLineText(item.chapter ?? item.label ?? item.number ?? '');
      title = cleanLineText(item.title ?? item.name ?? item.heading ?? item.value ?? '');
      rawSections = Array.isArray(item.sections)
        ? item.sections
        : (Array.isArray(item.subtopics) ? item.subtopics : []);
    }

    if (!title) continue;
    if (filterBoilerplate && isBoilerplateTitle(title)) continue;

    const dedupeKey = `${chapter.toLowerCase()}||${title.toLowerCase()}`;
    if (seenKeys.has(dedupeKey)) continue;
    seenKeys.add(dedupeKey);

    const sections = [];
    const seenSec = new Set();
    for (const sec of rawSections) {
      if (sections.length >= MAX_SECTIONS_PER_CHAPTER) break;
      const secText = cleanLineText(typeof sec === 'string' ? sec : (sec?.title || sec?.name || ''));
      if (!secText) continue;
      if (filterBoilerplate && isBoilerplateTitle(secText)) continue;
      const secKey = secText.toLowerCase();
      if (seenSec.has(secKey) || secKey === title.toLowerCase()) continue;
      seenSec.add(secKey);
      sections.push(secText.slice(0, 220));
    }

    normalized.push({
      chapter: (chapter || `Chapter ${normalized.length + 1}`).slice(0, 60),
      title: title.slice(0, 220),
      sections,
    });
  }

  return normalized;
}

/**
 * Parses a pasted multi-line Table of Contents string into structured entries.
 * Supports chapter prefixes ("Chapter 1:", "Ch. 2 -", "Unit 3", "1.") and
 * nested sections via indentation, bullets ("-", "*"), or decimal numbering ("1.1", "2.3.1").
 */
function parseManualTocText(rawText) {
  const lines = String(rawText || '')
    .split(/\r?\n/)
    .map((line) => ({
      raw: line,
      indent: (line.match(/^(\s*)/) || ['', ''])[1].replace(/\t/g, '  ').length,
      trimmed: line.trim(),
    }))
    .filter((l) => Boolean(l.trimmed));

  if (lines.length === 0) return [];

  const entries = [];
  let currentEntry = null;

  for (const line of lines) {
    const trimmed = line.trimmed;
    const isBullet = /^[-*•▪◦–—]\s+/.test(trimmed);
    const isSubNumbered = /^\d+\.\d+(?:\.\d+)?[\s.):–—-]+/.test(trimmed);
    const isIndented = line.indent >= 2;
    const isExplicitChapter = /^(?:chapter|ch\.?|unit|module|part|lesson|section)\s*[0-9ivxlcdm]+(?:[\s.:–—-]+|$)/i.test(trimmed);

    if ((isBullet || isSubNumbered || isIndented) && !isExplicitChapter && currentEntry) {
      const cleanedSec = cleanLineText(trimmed.replace(/^[-*•▪◦–—]\s+/, ''));
      if (cleanedSec) {
        currentEntry.sections.push(cleanedSec);
      }
      continue;
    }

    // Parse top-level chapter label & title
    let chapterLabel = '';
    let chapterTitle = trimmed;

    const explicitMatch = trimmed.match(/^((?:chapter|ch\.?|unit|module|part|lesson|section)\s*[0-9ivxlcdm]+)[\s.:–—-]+(.+)$/i);
    const numPrefixMatch = !explicitMatch ? trimmed.match(/^(\d{1,2})[.):\s–—-]+(.+)$/) : null;

    if (explicitMatch) {
      chapterLabel = cleanLineText(explicitMatch[1]);
      chapterTitle = cleanLineText(explicitMatch[2]);
    } else if (numPrefixMatch) {
      chapterLabel = `Chapter ${numPrefixMatch[1]}`;
      chapterTitle = cleanLineText(numPrefixMatch[2]);
    } else {
      chapterTitle = cleanLineText(trimmed);
      chapterLabel = `Chapter ${entries.length + 1}`;
    }

    if (!chapterTitle) continue;
    currentEntry = {
      chapter: chapterLabel || `Chapter ${entries.length + 1}`,
      title: chapterTitle,
      sections: [],
    };
    entries.push(currentEntry);
  }

  return normalizeTocEntries(entries, { filterBoilerplate: false });
}

// ============================================================================
// 3. ISBN & STAGE 1: OPEN LIBRARY + GOOGLE BOOKS APIs
// ============================================================================

function normalizeIsbn(raw) {
  const cleaned = String(raw || '').replace(/[^0-9Xx]/g, '').toUpperCase();
  if (/^\d{9}[\dX]$/.test(cleaned) || /^(978|979)\d{10}$/.test(cleaned)) {
    return cleaned;
  }
  return '';
}

function convertOpenLibraryToc(olToc = []) {
  if (!Array.isArray(olToc) || olToc.length === 0) return [];
  const entries = [];
  let current = null;

  for (const rawItem of olToc) {
    if (!rawItem) continue;
    const level = Number(rawItem.level ?? 0);
    const label = cleanLineText(rawItem.label || '');
    const title = cleanLineText(
      typeof rawItem === 'string'
        ? rawItem
        : (rawItem.title || rawItem.value || '')
    );
    if (!title) continue;

    if (level >= 1 && current) {
      const secText = label ? `${label} ${title}`.trim() : title;
      if (!isBoilerplateTitle(secText)) {
        current.sections.push(secText);
      }
      continue;
    }

    if (isBoilerplateTitle(title)) {
      current = null;
      continue;
    }

    const chapter = label
      ? (/^\d+$/.test(label) ? `Chapter ${label}` : label)
      : `Chapter ${entries.length + 1}`;

    current = { chapter, title, sections: [] };
    entries.push(current);
  }

  return normalizeTocEntries(entries, { filterBoilerplate: true });
}

async function fetchOpenLibraryTocByIsbn(isbn) {
  if (!isbn) return null;
  const bibKey = `ISBN:${isbn}`;
  const url = `https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(bibKey)}&format=json&jscmd=data`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const book = data?.[bibKey];
    if (!book) return null;

    if (Array.isArray(book.table_of_contents) && book.table_of_contents.length > 0) {
      const entries = convertOpenLibraryToc(book.table_of_contents);
      if (entries.length > 0) {
        return {
          toc_status: 'verified',
          toc_source: 'open_library',
          toc_entries: entries,
          source_url: book.url || `https://openlibrary.org/isbn/${isbn}`,
        };
      }
    }

    // Fallback check on the raw edition JSON if `key` is present (e.g. /books/OL...M)
    if (book.key && typeof book.key === 'string' && book.key.startsWith('/books/')) {
      const edUrl = `https://openlibrary.org${book.key}.json`;
      const edRes = await fetch(edUrl, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      }).catch(() => null);
      if (edRes && edRes.ok) {
        const edData = await edRes.json();
        if (Array.isArray(edData?.table_of_contents) && edData.table_of_contents.length > 0) {
          const entries = convertOpenLibraryToc(edData.table_of_contents);
          if (entries.length > 0) {
            return {
              toc_status: 'verified',
              toc_source: 'open_library',
              toc_entries: entries,
              source_url: book.url || `https://openlibrary.org${book.key}`,
            };
          }
        }
      }
    }

    return null;
  } catch (err) {
    console.warn(`[TOC Stage 1 - OpenLibrary] Lookup failed for ISBN ${isbn}:`, err.message);
    return null;
  }
}

async function fetchGoogleBooksMetadata(ref, primaryIsbn) {
  const queries = [];
  if (primaryIsbn) {
    queries.push(`isbn:${primaryIsbn}`);
  }
  if (ref.title) {
    const cleanTitle = String(ref.title).trim().slice(0, 120);
    const cleanAuthor = String(ref.author || '').split(/[,;&]/)[0].trim().slice(0, 60);
    queries.push(cleanAuthor ? `intitle:${cleanTitle}+inauthor:${cleanAuthor}` : `intitle:${cleanTitle}`);
  }

  for (const q of queries) {
    try {
      const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=3`;
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
        signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      if (items.length === 0) continue;

      const best = items[0]?.volumeInfo;
      if (!best) continue;

      const alternateIsbns = (Array.isArray(best.industryIdentifiers) ? best.industryIdentifiers : [])
        .map((idObj) => normalizeIsbn(idObj?.identifier))
        .filter((val) => Boolean(val) && val !== primaryIsbn);

      return {
        canonicalTitle: best.title || ref.title,
        subtitle: best.subtitle || '',
        authors: Array.isArray(best.authors) ? best.authors.join(', ') : (ref.author || ''),
        publisher: best.publisher || ref.publisher || '',
        publishedDate: best.publishedDate || '',
        infoLink: best.infoLink || best.previewLink || null,
        alternateIsbns: [...new Set(alternateIsbns)],
      };
    } catch (err) {
      console.warn(`[TOC Stage 1 - GoogleBooks] Query failed (${q}):`, err.message);
    }
  }

  return null;
}

async function runStage1BookApis(ref) {
  const primaryIsbn = normalizeIsbn(ref.isbn);

  // 1a. Try Open Library directly with stored ISBN
  if (primaryIsbn) {
    const olResult = await fetchOpenLibraryTocByIsbn(primaryIsbn);
    if (olResult) return { resolved: olResult, bookMeta: null };
  }

  // 1b. Query Google Books for corroborating metadata & alternate ISBNs (e.g., ISBN-10 vs ISBN-13 / different printings)
  const bookMeta = await fetchGoogleBooksMetadata(ref, primaryIsbn);
  if (bookMeta && Array.isArray(bookMeta.alternateIsbns)) {
    for (const altIsbn of bookMeta.alternateIsbns.slice(0, 2)) {
      const altOl = await fetchOpenLibraryTocByIsbn(altIsbn);
      if (altOl) {
        return { resolved: altOl, bookMeta };
      }
    }
  }

  return { resolved: null, bookMeta };
}

// ============================================================================
// 4. STAGE 2: LIVE WEB SEARCH GROUNDING (GEMINI -> GROQ; MISTRAL SKIPPED)
// ============================================================================

async function runStage2GeminiSearchGrounding(ref, bookMeta = null) {
  const caps = getProviderCapabilities();
  if (!caps.hasAnyWebSearchProvider) {
    return null;
  }

  const pubYear = ref.publication_year
    ? (new Date(ref.publication_year).getFullYear() || String(ref.publication_year).slice(0, 4))
    : (bookMeta?.publishedDate ? String(bookMeta.publishedDate).slice(0, 4) : 'Unknown');
  const isBook = isTextbookType(ref.type);

  const prompt = isBook
    ? `You are a strict academic librarian verifying the REAL published Table of Contents (TOC) of a textbook using live web search.

TEXTBOOK METADATA:
- Title: "${bookMeta?.canonicalTitle || ref.title}"${bookMeta?.subtitle ? ` (${bookMeta.subtitle})` : ''}
- Author(s): "${bookMeta?.authors || ref.author || 'Unknown'}"
- Publisher: "${bookMeta?.publisher || ref.publisher || 'Unknown'}"
- Year: "${pubYear}"
- ISBN: "${ref.isbn || 'Not provided'}"
${bookMeta?.infoLink ? `- Catalog Hint URL: ${bookMeta.infoLink}` : ''}

STRICT ANTI-HALLUCINATION RULES:
1. Use web search to locate authoritative publisher, library, or catalog pages (publisher TOC pages, WorldCat, Google Books, Open Library, O'Reilly, Wiley, Pearson, Springer, Elsevier, Packt, Amazon TOC preview) that list this EXACT textbook's actual published chapter titles.
2. ONLY set "found": true if your web search results genuinely contain this specific book's published chapter/section list.
3. If you CANNOT verify the real published Table of Contents from web search results, you MUST return:
   {"found": false, "source_url": null, "toc_entries": []}
4. NEVER fabricate, guess, extrapolate, or invent generic chapter names from the book's title or topic! Honesty is strictly mandatory.

Return ONLY valid JSON (no commentary) with this exact structure:
{
  "found": true,
  "source_url": "https://authoritative-url-where-toc-was-found",
  "toc_entries": [
    {
      "chapter": "Chapter 1",
      "title": "Exact Published Chapter Title",
      "sections": ["Optional Published Section 1.1", "Optional Published Section 1.2"]
    }
  ]
}`
    : `You are a strict academic librarian verifying the REAL published outline / section structure of an online educational resource using live web search.

RESOURCE METADATA:
- Title: "${ref.title}"
- Type: "${normalizeReferenceType(ref.type)}"
- Author/Org: "${ref.author || 'Unknown'}"
- URL: "${ref.link || 'Not provided'}"

STRICT ANTI-HALLUCINATION RULES:
1. Use web search to locate this exact online resource / guide / specification and retrieve its REAL published major sections or headings.
2. ONLY set "found": true if your web search results genuinely contain the real section/topic headings of this specific resource.
3. If the resource's real headings/sections CANNOT be verified from search results, return:
   {"found": false, "source_url": null, "toc_entries": []}
4. NEVER fabricate or guess generic headings from the title.

Return ONLY valid JSON (no commentary) with this exact structure:
{
  "found": true,
  "source_url": "${ref.link || 'https://...'}",
  "toc_entries": [
    {
      "chapter": "Section 1",
      "title": "Exact Section Heading",
      "sections": ["Optional Subheading"]
    }
  ]
}`;

  const searchRes = await searchWebJsonWithFallback({
    prompt,
    temperature: 0.1,
    taskLabel: `toc-ref-${ref.reference_id || 'preview'}`,
  });

  if (!searchRes.ok || !searchRes.data) {
    return null;
  }

  const tocSource = searchRes.tocSource || 'gemini_web_search';
  if (!searchRes.found || searchRes.data.found !== true) {
    return {
      toc_status: 'not_found',
      toc_source: tocSource,
      toc_entries: [],
      source_url: null,
    };
  }

  const entries = normalizeTocEntries(searchRes.data.toc_entries, { filterBoilerplate: true });
  if (entries.length < 2) {
    return {
      toc_status: 'not_found',
      toc_source: tocSource,
      toc_entries: [],
      source_url: null,
    };
  }

  const validSourceUrl =
    typeof searchRes.data.source_url === 'string' && /^https?:\/\//i.test(searchRes.data.source_url)
      ? searchRes.data.source_url.slice(0, 500)
      : (searchRes.groundedUrls[0] || '').slice(0, 500) || null;

  return {
    toc_status: 'verified',
    toc_source: tocSource,
    toc_entries: entries,
    source_url: validSourceUrl,
  };
}

// ============================================================================
// 5. STAGE 3: SSRF-SAFE WEBPAGE OUTLINE EXTRACTION (OER & ONLINE RESOURCES)
// ============================================================================

function isPrivateOrReservedIpv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0) return true;                          // 0.0.0.0/8
  if (a === 10) return true;                         // 10.0.0.0/8
  if (a === 127) return true;                        // 127.0.0.0/8 (loopback)
  if (a === 169 && b === 254) return true;           // 169.254.0.0/16 (link-local / cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true;  // 172.16.0.0/12
  if (a === 192 && b === 168) return true;           // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 (CGNAT)
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15
  if (a >= 224) return true;                         // Multicast / reserved
  return false;
}

function isPrivateOrReservedIp(ip) {
  const family = net.isIP(ip);
  if (family === 4) {
    return isPrivateOrReservedIpv4(ip);
  }
  if (family === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::1' || lower === '::') return true;
    if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // ULA fc00::/7
    if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) {
      return true; // Link-local fe80::/10
    }
    if (lower.startsWith('ff')) return true; // Multicast
    // Handle IPv4-mapped IPv6 addresses like ::ffff:127.0.0.1
    const v4Mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (v4Mapped) {
      return isPrivateOrReservedIpv4(v4Mapped[1]);
    }
    return false;
  }
  return true;
}

async function assertSafePublicUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(String(rawUrl || '').trim());
  } catch {
    throw new Error('Invalid URL format');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http and https URLs are permitted');
  }

  const host = parsed.hostname.toLowerCase();
  if (
    !host ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === 'metadata.google.internal'
  ) {
    throw new Error('Blocked private/local hostname');
  }

  if (net.isIP(host)) {
    if (isPrivateOrReservedIp(host)) {
      throw new Error('Blocked private IP address');
    }
    return parsed.toString();
  }

  const records = await dns.lookup(host, { all: true });
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error('Hostname could not be resolved');
  }
  for (const rec of records) {
    if (isPrivateOrReservedIp(rec.address)) {
      throw new Error(`Hostname resolved to blocked private IP (${rec.address})`);
    }
  }

  return parsed.toString();
}

async function safeFetchHtml(rawUrl) {
  let currentUrl = await assertSafePublicUrl(rawUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await fetch(currentUrl, {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.1',
      },
      signal: AbortSignal.timeout(URL_FETCH_TIMEOUT_MS),
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location || hop === MAX_REDIRECTS) {
        return null;
      }
      const nextUrl = new URL(location, currentUrl).toString();
      currentUrl = await assertSafePublicUrl(nextUrl);
      continue;
    }

    if (!res.ok) return null;

    const contentType = String(res.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      return null;
    }

    // Stream with strict byte cap to avoid memory abuse
    if (!res.body || typeof res.body.getReader !== 'function') {
      const txt = await res.text();
      return { html: txt.slice(0, MAX_HTML_BYTES), finalUrl: currentUrl };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let totalBytes = 0;
    let html = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_HTML_BYTES) {
        html += decoder.decode(value.slice(0, Math.max(0, MAX_HTML_BYTES - (totalBytes - value.byteLength))), { stream: false });
        await reader.cancel().catch(() => {});
        break;
      }
      html += decoder.decode(value, { stream: true });
    }
    html += decoder.decode();
    return { html, finalUrl: currentUrl };
  }

  return null;
}

function extractOutlineFromHtml(html) {
  if (!html) return [];

  // Prefer <main> or <article> region if present to avoid sidebar/nav noise
  let region = html;
  const mainMatch = html.match(/<(?:main|article)\b[^>]*>([\s\S]*?)<\/(?:main|article)>/i);
  if (mainMatch && mainMatch[1] && mainMatch[1].length > 300) {
    region = mainMatch[1];
  }

  const cleaned = region
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, ' ');

  const headingRegex = /<(h[1-3])\b[^>]*>([\s\S]*?)<\/\1>/gi;
  const headings = [];
  let match;
  while ((match = headingRegex.exec(cleaned)) !== null) {
    const level = Number(match[1].slice(1));
    const text = cleanLineText(match[2]);
    if (!text || text.length < 3 || text.length > 180) continue;
    if (isBoilerplateTitle(text)) continue;
    headings.push({ level, text });
  }

  if (headings.length === 0) return [];

  // Determine primary section heading level (prefer h2 if multiple h2s exist, else h1)
  const h2Count = headings.filter((h) => h.level === 2).length;
  const primaryLevel = h2Count >= 2 ? 2 : Math.min(...headings.map((h) => h.level));

  const entries = [];
  let current = null;

  for (const h of headings) {
    if (h.level <= primaryLevel) {
      // Skip single page-title h1 when h2 sections drive the outline
      if (primaryLevel === 2 && h.level === 1 && entries.length === 0) {
        continue;
      }
      current = {
        chapter: `Section ${entries.length + 1}`,
        title: h.text,
        sections: [],
      };
      entries.push(current);
    } else if (current) {
      current.sections.push(h.text);
    }
  }

  return normalizeTocEntries(entries, { filterBoilerplate: true });
}

async function runStage3UrlOutline(ref) {
  const link = String(ref.link || '').trim();
  if (!/^https?:\/\//i.test(link)) return null;

  try {
    const fetched = await safeFetchHtml(link);
    if (!fetched || !fetched.html) return null;

    const entries = extractOutlineFromHtml(fetched.html);
    if (entries.length >= 2 || (entries.length === 1 && entries[0].sections.length >= 2)) {
      return {
        toc_status: 'verified',
        toc_source: 'url_outline',
        toc_entries: entries,
        source_url: fetched.finalUrl.slice(0, 500),
      };
    }
    return null;
  } catch (err) {
    console.warn(`[TOC Stage 3 - URL Outline] Blocked/failed for ref #${ref.reference_id} (${link}):`, err.message);
    return null;
  }
}

// ============================================================================
// 6. FULL WATERFALL ORCHESTRATOR & DATABASE CACHE PERSISTENCE
// ============================================================================

async function resolveSingleReferenceToc(ref, { allowSupportingWebSearch = true } = {}) {
  const isTextbook = isTextbookType(ref.type);

  if (isTextbook) {
    // Stage 1: Open Library -> Google Books (corroborating metadata + alternate ISBNs)
    const { resolved: stage1Result, bookMeta } = await runStage1BookApis(ref);
    if (stage1Result) return stage1Result;

    // Stage 2: Live Web Search Grounding (Gemini -> Groq; Mistral strictly skipped)
    const stage2Result = await runStage2GeminiSearchGrounding(ref, bookMeta);
    if (stage2Result && stage2Result.toc_status === 'verified') {
      return stage2Result;
    }

    // Strict honesty: never fabricate chapters from book title
    return {
      toc_status: 'not_found',
      toc_source: stage2Result?.toc_source || 'open_library',
      toc_entries: [],
      source_url: null,
    };
  }

  // Supporting references (OER, Online Resources, Online Subscriptions)
  // Stage 3: Safe webpage outline extraction if URL exists
  const stage3Result = await runStage3UrlOutline(ref);
  if (stage3Result) return stage3Result;

  // Fallback to Stage 1 if an OER happens to have a valid ISBN
  if (normalizeIsbn(ref.isbn)) {
    const { resolved: stage1Oer } = await runStage1BookApis(ref);
    if (stage1Oer) return stage1Oer;
  }

  // Fallback to Stage 2 live web search when enabled (always on for explicit single-ref re-check)
  if (allowSupportingWebSearch) {
    const stage2Result = await runStage2GeminiSearchGrounding(ref, null);
    if (stage2Result && stage2Result.toc_status === 'verified') {
      return stage2Result;
    }
  }

  return {
    toc_status: 'not_found',
    toc_source: ref.link ? 'url_outline' : null,
    toc_entries: [],
    source_url: null,
  };
}

async function upsertTocCache(referenceId, payload) {
  const now = new Date();
  const cleanEntries = Array.isArray(payload.toc_entries) ? payload.toc_entries : [];
  const data = {
    reference_id: Number(referenceId),
    toc_status: payload.toc_status || 'not_found',
    toc_source: payload.toc_source || null,
    toc_entries: cleanEntries,
    source_url: payload.source_url ? String(payload.source_url).slice(0, 500) : null,
    checked_at: now,
  };

  const existing = await db.ReferenceTocCache.findOne({
    where: { reference_id: Number(referenceId) },
  });

  if (existing) {
    await existing.update(data);
    return existing;
  }
  return db.ReferenceTocCache.create(data);
}

function formatReferenceWithToc(refRow, cacheRow) {
  const ref = typeof refRow.toJSON === 'function' ? refRow.toJSON() : refRow;
  const cache = cacheRow && typeof cacheRow.toJSON === 'function' ? cacheRow.toJSON() : cacheRow;
  const entries = Array.isArray(cache?.toc_entries) ? cache.toc_entries : [];
  const status = cache?.toc_status || 'not_found';
  const pubYear = ref.publication_year
    ? (new Date(ref.publication_year).getFullYear() || String(ref.publication_year).slice(0, 4))
    : null;

  return {
    reference_id: Number(ref.reference_id),
    course_id: ref.course_id ? Number(ref.course_id) : null,
    course_no: ref.course_no || null,
    title: ref.title || '',
    author: ref.author || '',
    type: normalizeReferenceType(ref.type),
    is_textbook: isTextbookType(ref.type),
    isbn: ref.isbn || '',
    link: ref.link || '',
    publisher: ref.publisher || '',
    publication_year: pubYear ? String(pubYear) : '',
    toc_status: status,
    toc_source: cache?.toc_source || null,
    toc_entries: entries,
    chapterCount: entries.length,
    source_url: cache?.source_url || null,
    checked_at: cache?.checked_at || null,
    is_verified: (status === 'verified' || status === 'manual') && entries.length > 0,
  };
}

/**
 * Resolves the course (course_id, course_no) and loads all active References linked to it,
 * along with their current `reference_toc_cache` rows (if any).
 */
async function loadCourseReferencesWithCache({ weekId, courseId, pcOfferingId, courseNo } = {}) {
  let resolvedCourseId = courseId ? Number(courseId) : null;
  let resolvedCourseNo = courseNo ? String(courseNo).trim() : null;

  if (!resolvedCourseId && weekId) {
    const week = await db.Week.findByPk(Number(weekId), {
      include: [
        {
          model: db.CourseOutcome,
          as: 'courseOutcome',
          include: [
            {
              model: db.ProgramCourseOffering,
              as: 'offering',
              include: [{ model: db.Course, as: 'course' }],
            },
          ],
        },
      ],
    });
    const offering = week?.courseOutcome?.offering;
    if (offering?.course_id) {
      resolvedCourseId = Number(offering.course_id);
      resolvedCourseNo = offering.course?.course_no || resolvedCourseNo;
    }
  }

  if (!resolvedCourseId && pcOfferingId) {
    const offering = await db.ProgramCourseOffering.findByPk(Number(pcOfferingId), {
      include: [{ model: db.Course, as: 'course' }],
    });
    if (offering?.course_id) {
      resolvedCourseId = Number(offering.course_id);
      resolvedCourseNo = offering.course?.course_no || resolvedCourseNo;
    }
  }

  if (!resolvedCourseId && resolvedCourseNo) {
    const course = await db.Course.findOne({ where: { course_no: resolvedCourseNo } });
    if (course) {
      resolvedCourseId = Number(course.course_id);
    }
  }

  const where = { archived: false };
  if (resolvedCourseId) {
    const filed = await db.CourseReference.findAll({
      where: { course_id: resolvedCourseId },
      attributes: ['reference_id'],
      raw: true,
    });
    const filedRefIds = filed.map((f) => Number(f.reference_id)).filter(Boolean);
    where[Op.or] = [
      { course_id: resolvedCourseId },
      ...(filedRefIds.length > 0 ? [{ reference_id: { [Op.in]: filedRefIds } }] : []),
    ];
  } else if (resolvedCourseNo) {
    where.course_no = resolvedCourseNo;
  } else {
    return { courseId: null, courseNo: null, references: [] };
  }

  const rows = await db.Reference.findAll({
    where,
    include: [{ model: db.ReferenceTocCache, as: 'tocCache', required: false }],
    order: [['reference_id', 'ASC']],
  });

  return {
    courseId: resolvedCourseId,
    courseNo: resolvedCourseNo,
    references: rows,
  };
}

/**
 * Concurrency-limited parallel mapper (keeps external API usage polite and fast).
 */
async function mapWithConcurrency(items, concurrency, fn) {
  const results = new Array(items.length);
  let nextIdx = 0;

  async function worker() {
    while (nextIdx < items.length) {
      const idx = nextIdx++;
      results[idx] = await fn(items[idx], idx);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}

/**
 * Bulk-resolves TOCs for a course's references (or a specific list of `referenceIds`).
 * Honors Refinement #2:
 *   When `forceRefresh: true` is called for the whole course (no explicit `referenceIds`),
 *   records with `toc_status === 'manual'` are PROTECTED and never overwritten.
 *   They are only re-resolved if explicitly listed in `referenceIds`.
 */
async function resolveCourseReferencesTocs({
  weekId,
  courseId,
  pcOfferingId,
  courseNo,
  referenceIds = null,
  forceRefresh = false,
} = {}) {
  const targetedIds = Array.isArray(referenceIds) && referenceIds.length > 0
    ? new Set(referenceIds.map(Number).filter(Boolean))
    : null;

  let loaded;
  if (targetedIds && !weekId && !courseId && !pcOfferingId && !courseNo) {
    const rows = await db.Reference.findAll({
      where: { reference_id: { [Op.in]: [...targetedIds] }, archived: false },
      include: [{ model: db.ReferenceTocCache, as: 'tocCache', required: false }],
      order: [['reference_id', 'ASC']],
    });
    loaded = { courseId: rows[0]?.course_id || null, courseNo: rows[0]?.course_no || null, references: rows };
  } else {
    loaded = await loadCourseReferencesWithCache({ weekId, courseId, pcOfferingId, courseNo });
  }

  const refsToProcess = loaded.references;
  const textbookRows = refsToProcess.filter((r) => isTextbookType(r.type));
  const supportingRows = refsToProcess.filter((r) => !isTextbookType(r.type));

  const processRow = async (refRow) => {
    const refId = Number(refRow.reference_id);
    const existingCache = refRow.tocCache || null;
    const isExplicitlyTargeted = Boolean(targetedIds && targetedIds.has(refId));

    // If caller passed specific `referenceIds`, leave non-targeted references as-is
    if (targetedIds && !isExplicitlyTargeted) {
      return formatReferenceWithToc(refRow, existingCache);
    }

    // Refinement #2: Protect manual TOCs during whole-course forceRefresh
    if (existingCache && existingCache.toc_status === 'manual' && !isExplicitlyTargeted) {
      return formatReferenceWithToc(refRow, existingCache);
    }

    // Use existing cache unless missing or forceRefresh requested
    if (existingCache && !forceRefresh) {
      return formatReferenceWithToc(refRow, existingCache);
    }

    const resolved = await resolveSingleReferenceToc(refRow, {
      allowSupportingWebSearch: isExplicitlyTargeted,
    });
    const savedCache = await upsertTocCache(refId, resolved);
    return formatReferenceWithToc(refRow, savedCache);
  };

  // Resolve mandatory Textbooks first (polite concurrency=2 for live web search), then supporting OER/ORs
  const textbooks = await mapWithConcurrency(textbookRows, 2, processRow);
  const supportingReferences = await mapWithConcurrency(supportingRows, 4, processRow);

  const verifiedTextbooks = textbooks.filter((r) => r.is_verified);
  const unverifiedTextbooks = textbooks.filter((r) => !r.is_verified);
  const verifiedSupporting = supportingReferences.filter((r) => r.is_verified);
  const unverifiedSupporting = supportingReferences.filter((r) => !r.is_verified);

  return {
    courseId: loaded.courseId,
    courseNo: loaded.courseNo,
    textbooks,
    supportingReferences,
    summary: (() => {
      const caps = getProviderCapabilities();
      return {
        totalTextbooks: textbooks.length,
        verifiedTextbooks: verifiedTextbooks.length,
        unverifiedTextbooks: unverifiedTextbooks.length,
        totalSupporting: supportingReferences.length,
        verifiedSupporting: verifiedSupporting.length,
        unverifiedSupporting: unverifiedSupporting.length,
        canGenerate: verifiedTextbooks.length > 0,
        geminiSearchEnabled: Boolean(getValidGeminiApiKey()),
        webSearchEnabled: caps.hasAnyWebSearchProvider,
        webSearchProviders: caps.webSearchProviders,
      };
    })(),
  };
}

/**
 * Saves a manually pasted TOC for a specific reference (unlocks `toc_status = 'manual'`).
 */
async function saveManualReferenceToc(referenceId, { rawText, toc_entries } = {}) {
  const ref = await db.Reference.findByPk(Number(referenceId));
  if (!ref) {
    const err = new Error('Reference not found.');
    err.status = 404;
    throw err;
  }

  let entries = [];
  if (Array.isArray(toc_entries) && toc_entries.length > 0) {
    entries = normalizeTocEntries(toc_entries, { filterBoilerplate: false });
  } else if (typeof rawText === 'string' && rawText.trim()) {
    entries = parseManualTocText(rawText);
  }

  if (entries.length === 0) {
    const err = new Error('Please paste at least one chapter or section title to save a manual Table of Contents.');
    err.status = 400;
    throw err;
  }

  const savedCache = await upsertTocCache(ref.reference_id, {
    toc_status: 'manual',
    toc_source: 'manual_paste',
    toc_entries: entries,
    source_url: null,
  });

  return formatReferenceWithToc(ref, savedCache);
}

module.exports = {
  getValidGeminiApiKey,
  getGeminiModelCandidates,
  createGeminiClient,
  normalizeTocEntries,
  parseManualTocText,
  normalizeIsbn,
  assertSafePublicUrl,
  extractOutlineFromHtml,
  resolveSingleReferenceToc,
  loadCourseReferencesWithCache,
  formatReferenceWithToc,
  resolveCourseReferencesTocs,
  saveManualReferenceToc,
};
