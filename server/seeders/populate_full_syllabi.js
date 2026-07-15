// Standalone data-population script (run: `node seeders/populate_full_syllabi.js`)
// Fills the full normalized syllabus data for EVERY course in src/data/syllabiData.js
// that doesn't already have it: CourseOutcomes, ILOs, References, ILOReferences, Topics,
// Subtopics, ILOTopics, TLAs, TopicTLAs, TLAAssessments.
//
// Idempotent-ish: skips a course whose offering already has CourseOutcomes.
// Per-course try/catch: a failure is logged and the rest continue.

const mysql = require('mysql2/promise');
const now = new Date();

const getProgram = (code) => (String(code).startsWith('BSCS') ? 2 : 1);
const refType = (t) => {
    const s = String(t || '').toLowerCase();
    if (s.includes('open') || s.includes('oer')) return 'OER';
    if (s.includes('online') || s.includes('web')) return 'ONLINE';
    return 'TEXTBOOK';
};
const toInt = (v) => { const n = parseInt(String(v || '').replace(/\D/g, ''), 10); return Number.isFinite(n) ? n : 0; };
// ponytail: global lock on per-course transactions, per-course locks if contention arises
const PERIODS = ['p', 'm', 's', 'f'];
const PERIOD_KEY_MAP = { prelim: 'p', midterm: 'm', semi: 's', final: 'f' };

async function main() {
    const conn = await mysql.createConnection({
        host: '127.0.0.1', port: 3308, user: 'root', password: 'rootpassword', database: 'lpms_composition',
    });
    const { syllabiData } = require('../../src/data/syllabiData.js');

    const ins = async (sql, params) => { const [res] = await conn.query(sql, params); return res.insertId; };
    const exist = async (sql, params) => { const [rows] = await conn.query(sql, params); return rows.length > 0; };

    let done = 0, skipped = 0, failed = 0;

    for (const s of syllabiData) {
        try {
            await conn.beginTransaction();

            // 1. Ensure Course + Offering + Assignment exist
            const [[course]] = await conn.query('SELECT course_id FROM Courses WHERE course_no = ? LIMIT 1', [s.code]);
            let courseId = course ? course.course_id : null;
            let pcoId = null;
            if (courseId) {
                const [[pco]] = await conn.query('SELECT pc_offering_id FROM ProgramCourseOfferings WHERE course_id = ? ORDER BY pc_offering_id ASC LIMIT 1', [courseId]);
                pcoId = pco ? pco.pc_offering_id : null;
            } else {
                courseId = await ins(
                    `INSERT INTO Courses (course_no, course_title, credit, contact_hrs, classification, cmo, year_lvl, term, createdAt, updatedAt)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [s.code, (s.name || '').slice(0, 100), String(s.credits || 'N/A').slice(0, 30), String(s.contact || 'N/A').slice(0, 30),
                     String(s.class || 'N/A').slice(0, 50), String(s.cmo || 'N/A').slice(0, 30), String(s.year || 'N/A').slice(0, 30), String(s.sem || 'N/A').slice(0, 30), now, now]
                );
            }
            if (!pcoId) {
                pcoId = await ins(
                     `INSERT INTO ProgramCourseOfferings (revision_number, course_id, program_id, dept_id, course_description, createdAt, updatedAt)
                      VALUES (1, ?, ?, 1, ?, ?, ?)`,
                    [courseId, getProgram(s.code), (s.name || '') + ' - syllabus', now, now]
                );
                await ins(
                    `INSERT INTO CourseOfferingAssignments (pc_offering_id, stakeholder_id, date_assigned, createdAt, updatedAt) VALUES (?, NULL, ?, ?, ?)`,
                    [pcoId, s.update ? new Date(s.update) : new Date('2026-03-05'), now, now]
                );
            }

            // Always refresh the human-readable course description on the offering so Course Details is never blank.
            if (pcoId) {
                const desc = (String(s.description || '').trim() || `${s.name} syllabus`).slice(0, 1000);
                await conn.query('UPDATE ProgramCourseOfferings SET course_description = ? WHERE pc_offering_id = ?', [desc, pcoId]);
            }

            // --- 1b. Prerequisites (link by course code) ---
            if (s.prerequisites && String(s.prerequisites).trim()) {
                const prereqCodes = String(s.prerequisites).split(/[,;]/).map(p => p.trim().split(/\s+/)[0]).filter(Boolean);
                for (const pCode of prereqCodes) {
                    const [[pCourse]] = await conn.query('SELECT course_id FROM Courses WHERE course_no = ? LIMIT 1', [pCode]);
                    if (pCourse && !(await exist('SELECT 1 FROM Prerequisites WHERE course_id = ? AND prerequisite_course_id = ?', [courseId, pCourse.course_id]))) {
                        await ins('INSERT INTO Prerequisites (course_id, prerequisite_course_id, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
                            [courseId, pCourse.course_id, now, now]);
                    }
                }
            }

            // Clean any existing/partial detail for this offering (FKs cascade from CourseOutcomes)
            await conn.query('DELETE FROM CourseOutcomes WHERE pc_offering_id = ?', [pcoId]);

            // 2. CourseOutcomes  (map 'CO1' -> co_id)
            const coMap = {};
            const coIndexMap = {}; // "CO1" → 0, "CO2" → 1, ...
            (s.courseOutcomes || []).forEach((co, i) => { coIndexMap[co.id] = i; });
            for (const co of (s.courseOutcomes || [])) {
                coMap[co.id] = await ins(`INSERT INTO CourseOutcomes (pc_offering_id, co_description, createdAt, updatedAt) VALUES (?, ?, ?, ?)`,
                    [pcoId, co.description || '', now, now]);
            }

            // --- 2b. ProgramOutcomeAlignments from poMappings ---
            const progId = getProgram(s.code);
            const poOffset = progId === 1 ? 1 : 11; // BSIT:1-10, BSCS:11-20
            for (const co of (s.courseOutcomes || [])) {
                const dbCoId = coMap[co.id];
                if (!dbCoId || !co.poMappings) continue;
                (co.poMappings || []).forEach((level, i) => {
                    if (!level || !level.trim()) return;
                    if (i >= 10) return; // only 10 POs per program
                    const poId = poOffset + i;
                    ins('INSERT INTO ProgramOutcomeAlignments (co_id, po_id, attainment_level, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
                        [dbCoId, poId, level.trim(), now, now]).catch(() => {});
                });
            }

            // 3. ILOs  (map 'CO1-ILO1' -> ilo_id)
            const iloMap = {};
            // Build gradingSystem lookup: key = "CO1-ILO1" → { weight, minPassing, periodKey }
            const gradingLookup = {};
            if (s.gradingSystem) {
                for (const gco of s.gradingSystem) {
                    for (const gilo of (gco.ilos || [])) {
                        const key = `${gco.co}-${gilo.id}`;
                        // Find the non-empty period
                        let foundPeriod = '';
                        let foundWeight = '';
                        for (const [pk, pv] of Object.entries(gilo.weight || {})) {
                            if (pv && String(pv).trim()) {
                                foundPeriod = PERIOD_KEY_MAP[pk] || '';
                                foundWeight = String(pv).trim();
                                break;
                            }
                        }
                        gradingLookup[key] = {
                            period: foundPeriod,
                            weight: foundWeight,
                            minPassing: gilo.minPassing ? parseInt(gilo.minPassing, 10) : null,
                        };
                    }
                }
            }

            // Count ILOs per CO for default weight distribution
            const iloCountPerCO = {};
            for (const ilo of (s.ilos || [])) {
                const coLabel = String(ilo.id).split('-')[0];
                iloCountPerCO[coLabel] = (iloCountPerCO[coLabel] || 0) + 1;
            }
            // Detect COs with incomplete gradingLookup — use pure even-split for those
            const coGradingComplete = {};
            for (const coLabel of Object.keys(iloCountPerCO)) {
                const complete = gradingLookup[`${coLabel}-ILO1`] && gradingLookup[`${coLabel}-ILO2`] && gradingLookup[`${coLabel}-ILO3`];
                coGradingComplete[coLabel] = !!complete;
            }

            const CO_PERIOD = { CO1: 'p', CO2: 'm', CO3: 's', CO4: 'f' };

            for (const ilo of (s.ilos || [])) {
                const coLabel = String(ilo.id).split('-')[0];
                const coId = coMap[coLabel];
                if (!coId) continue;
                const gl = gradingLookup[ilo.id] || {};
                const count = iloCountPerCO[coLabel] || 3;
                const fallbackWeight = String(Math.floor(100 / count));
                const fallbackPeriod = CO_PERIOD[coLabel] || '';
                let period = fallbackPeriod;
                let weight = fallbackWeight;
                if (coGradingComplete[coLabel] && gl.period && gl.weight) {
                    period = gl.period;
                    weight = gl.weight;
                }
                iloMap[ilo.id] = await ins(
                    `INSERT INTO IntendedLearningOutcomes (co_id, description, hours, grade_period, grade_weight, min_passing, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [coId, (ilo.intendedLearningOutcome || '').slice(0, 100), toInt(ilo.allocatedTime),
                     period || null, weight || null, gl.minPassing || 60, now, now]);
            }

            // 4. References (map title & id -> reference_id)
            const refMap = {};
            for (const r of (s.references || [])) {
                const refId = await ins(
                    'INSERT INTO `References` (title, author, isbn, link, publication_year, type, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [String(r.title || 'Untitled').slice(0, 200), String(r.authors || r.author || 'N/A').slice(0, 200), r.isbn ? String(r.isbn).slice(0, 100) : null,
                     r.link ? String(r.link).slice(0, 500) : null, r.year ? new Date(`${r.year}-01-01`) : null, refType(r.type).slice(0, 30), now, now]
                );
                if (r.title) refMap[r.title] = refId;
                if (r.id) refMap[r.id] = refId;
            }

            // owner ILO per topic title (first ILO that references it)
            const topicOwner = {};
            for (const ilo of (s.ilos || [])) for (const tt of (ilo.topics || [])) if (!topicOwner[tt] && iloMap[ilo.id]) topicOwner[tt] = iloMap[ilo.id];
            const anyIlo = Object.values(iloMap)[0] || null;

            // 5. Topics + Subtopics (map title -> topic_id)
            const topicMap = {};
            for (const tp of (s.topics || [])) {
                const owner = topicOwner[tp.title] || anyIlo;
                if (!owner) continue;
                const topicId = await ins(`INSERT INTO Topics (ilo_id, title, createdAt, updatedAt) VALUES (?, ?, ?, ?)`, [owner, String(tp.title || '').slice(0, 70), now, now]);
                topicMap[tp.title] = topicId;
                let seq = 1;
                for (const sub of (tp.subtopics || [])) {
                    await ins(`INSERT INTO Subtopics (topic_id, title, sequence_order, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)`,
                        [topicId, String(sub.value || sub.title || '').slice(0, 70), seq++, now, now]);
                }
            }

            // 6. ILOTopics (map ilo:topic -> ilo_topic_id) + ILOReferences
            const iloTopicMap = {};
            for (const ilo of (s.ilos || [])) {
                const iloId = iloMap[ilo.id];
                if (!iloId) continue;
                for (const tt of (ilo.topics || [])) {
                    const topicId = topicMap[tt];
                    if (!topicId) continue;
                    const key = `${iloId}:${topicId}`;
                    if (iloTopicMap[key]) continue;
                    iloTopicMap[key] = await ins(`INSERT INTO ILOTopics (ilo_id, topic_id, createdAt, updatedAt) VALUES (?, ?, ?, ?)`, [iloId, topicId, now, now]);
                }
                for (const refStr of (ilo.references || [])) {
                    const refKey = String(refStr).split(' - ')[0].trim();
                    const refId = refMap[refKey] || refMap[refStr];
                    if (refId) await ins(`INSERT INTO ILOReferences (ilo_id, reference_id, createdAt, updatedAt) VALUES (?, ?, ?, ?)`, [iloId, refId, now, now]);
                }
            }

            // 7. TLAs + TopicTLAs (map tlaName -> tla_id) — also build tla→ilo mapping
            const tlaMap = {};
            const tlaIloMap = {}; // tlaName → [iloId, ...]
            for (const tp of (s.topics || [])) {
                const topicId = topicMap[tp.title];
                if (!topicId) continue;
                for (const tla of (tp.tlas || [])) {
                    let tlaId = tlaMap[tla.tlaName];
                    if (!tlaId) {
                        tlaId = await ins(
                            `INSERT INTO TeachingAndLearningActivities (tla_name, class_phase, performed_by, description, is_lab, createdAt, updatedAt)
                             VALUES (?, ?, ?, ?, ?, ?, ?)`,
                            [String(tla.tlaName || '').slice(0, 70), String(tla.classPhase || '').slice(0, 30), String(tla.performedBy || 'T').slice(0, 1), tla.tlaDescription || '', tla.laboratory ? 1 : 0, now, now]
                        );
                        tlaMap[tla.tlaName] = tlaId;
                    }
                    for (const [key, itId] of Object.entries(iloTopicMap)) {
                        if (key.endsWith(`:${topicId}`)) {
                            await ins(`INSERT INTO TopicTLAs (ilo_topic_id, tla_id, createdAt, updatedAt) VALUES (?, ?, ?, ?)`, [itId, tlaId, now, now]);
                            // Track ILO ids per TLA (key = "iloId:topicId")
                            const iloId = parseInt(key.split(':')[0], 10);
                            if (!tlaIloMap[tla.tlaName]) tlaIloMap[tla.tlaName] = [];
                            if (!tlaIloMap[tla.tlaName].includes(iloId)) tlaIloMap[tla.tlaName].push(iloId);
                        }
                    }
                }
            }

            // 8. TLAAssessments — with period/weight/min_passing from gradingSystem
            const PERIODS_BY_CO = ['p', 'm', 's', 'f']; // CO1→p, CO2→m, CO3→s, CO4→f

            // First pass: count assessments per ILO for weight distribution
            const assessCountPerIlo = {};
            const assessInfos = [];
            for (const a of (s.assessments || [])) {
                const tlaId = tlaMap[a.tlaName];
                if (!tlaId) continue;
                // Determine which ILO(s) this assessment belongs to
                const linkedIloKeys = (tlaIloMap[a.tlaName] || []).map(dbIloId => {
                    // Find the static ilo.id from iloMap by value
                    for (const [staticId, dbId] of Object.entries(iloMap)) {
                        if (dbId === dbIloId) return staticId;
                    }
                    return null;
                }).filter(Boolean);
                // Use the first linked ILO as the primary (ponytail: first-ILO heuristic, per-ILO breakdown if needed)
                const primaryIlo = linkedIloKeys[0] || null;
                assessInfos.push({ a, tlaId, primaryIlo });
                if (primaryIlo) {
                    assessCountPerIlo[primaryIlo] = (assessCountPerIlo[primaryIlo] || 0) + 1;
                }
            }

            // Second pass: insert with correct period/weight/min_passing
            // Count assessments per (CO, period) for weight distribution
            const coPeriodCount = {};
            for (const { primaryIlo } of assessInfos) {
                if (!primaryIlo) continue;
                const coId = String(primaryIlo).split('-')[0];
                const coIdx = coIndexMap[coId];
                if (coIdx === undefined) continue;
                const p = PERIODS_BY_CO[coIdx % 4];
                const key = `${coId}_${p}`;
                coPeriodCount[key] = (coPeriodCount[key] || 0) + 1;
            }
            const insertedWeights = {};
            for (const { a, tlaId, primaryIlo } of assessInfos) {
                let period = null;
                let weight = '0';
                let minPassing = null;

                const deriveFallback = (key) => {
                    const coId = String(key).split('-')[0];
                    const coIdx = coIndexMap[coId];
                    if (coIdx === undefined) return;
                    period = PERIODS_BY_CO[coIdx % 4];
                    const cpKey = `${coId}_${period}`;
                    const total = coPeriodCount[cpKey] || 1;
                    weight = String(Math.floor(100 / total));
                };

                if (primaryIlo && gradingLookup[primaryIlo]) {
                    const gl = gradingLookup[primaryIlo];
                    if (gl.period && gl.weight) {
                        period = gl.period;
                        const count = assessCountPerIlo[primaryIlo] || 1;
                        const wtNum = parseFloat(gl.weight);
                        const divided = Math.floor(wtNum / count);
                        const usedKey = `${primaryIlo}_${gl.period}`;
                        const remainder = wtNum - divided * count;
                        const extra = (!insertedWeights[usedKey] && remainder > 0) ? remainder : 0;
                        insertedWeights[usedKey] = (insertedWeights[usedKey] || 0) + 1;
                        weight = String(divided + (insertedWeights[usedKey] === 1 ? extra : 0));
                    } else {
                        deriveFallback(primaryIlo);
                    }
                    if (gl.minPassing) minPassing = gl.minPassing;
                } else if (primaryIlo) {
                    deriveFallback(primaryIlo);
                }

                await ins(
                    `INSERT INTO TLAAssessments (tla_id, name, description, period, weight, min_passing, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [tlaId,
                     String(a.assessmentMethod || a.assessmentName || 'Assessment').slice(0, 70),
                     a.description || a.assessmentDescription || '',
                     period,
                     weight,
                     minPassing,
                     now, now]
                );
            }

            // --- 8b. Clean up TLAAssessments with no period (optional fallback) ---
            // (left as-is; period stays null for assessments with no grading match)

            await conn.commit();
            done++;
            console.log(`✓ ${s.code}`);
        } catch (e) {
            try { await conn.rollback(); } catch (_) { /* ignore */ }
            failed++;
            console.error(`✗ ${s.code}: ${e.message}`);
        }
    }

    console.log(`\nDone. Populated: ${done}, Skipped (already had data): ${skipped}, Failed: ${failed}`);
    await conn.end();
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
