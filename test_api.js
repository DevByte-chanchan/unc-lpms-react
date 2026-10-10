import fs from 'fs';
import path from 'path';

async function fetchApi(path, method = 'GET', body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(`http://localhost:3000/api${path}`, options);
    const text = await res.text();
    try {
        return { status: res.status, data: JSON.parse(text) };
    } catch {
        return { status: res.status, data: text };
    }
}

async function test() {
    console.log("=== Testing isolation for BSCS111L ===");
    
    // Save items for Midterm
    console.log("Saving Midterm items...");
    const mRes = await fetchApi('/courses/BSCS111L/Midterm/items', 'PUT', [
        { ilo: 'ILO1', cognitiveLevel: 'Remembering', instruction: 'Midterm Q1', points: 10, span: 1 }
    ]);
    console.log('Midterm items save:', mRes.status, mRes.data.length ? '1 item' : mRes.data);

    // Save items for Finals
    console.log("Saving Finals items...");
    const fRes = await fetchApi('/courses/BSCS111L/Finals/items', 'PUT', [
        { ilo: 'ILO1', cognitiveLevel: 'Remembering', instruction: 'Finals Q1', points: 15, span: 1 },
        { ilo: 'ILO2', cognitiveLevel: 'Applying', instruction: 'Finals Q2', points: 20, span: 1 }
    ]);
    console.log('Finals items save:', fRes.status, fRes.data.length ? '2 items' : fRes.data);

    // Verify separation
    const mGet = await fetchApi('/courses/BSCS111L/Midterm/items');
    console.log('Midterm items after:', mGet.data.map(i => i.instruction));

    const fGet = await fetchApi('/courses/BSCS111L/Finals/items');
    console.log('Finals items after:', fGet.data.map(i => i.instruction));

    // Status test
    console.log("\nChanging Midterm status to 'approved'...");
    await fetchApi('/courses/BSCS111L/Midterm/status', 'PUT', { status: 'approved' });
    
    const mStat = await fetchApi('/courses/BSCS111L/Midterm/status');
    console.log('Midterm status:', mStat.data.status);
    
    const fStat = await fetchApi('/courses/BSCS111L/Finals/status');
    console.log('Finals status:', fStat.data.status);
}

test().catch(console.error);