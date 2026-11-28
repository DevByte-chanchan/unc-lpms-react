// node src/utils/checkJsxImports.js
//
// Every component used in JSX must be defined in the file that uses it.
//
// WHY THIS SCRIPT EXISTS. This has now shipped twice:
//
//   * `lastSectionKey.current` survived a revert that deleted the useRef, and
//     silently swallowed approver comments until someone read the code.
//   * `<Spinner />` was used in ApprovalSyllabusSections without its import.
//     The build succeeded. The page threw `ReferenceError: Spinner is not
//     defined` and the whole screen was replaced by "Something went wrong".
//
// Neither was caught, and I twice told this project that turning on eslint's
// `no-undef` would catch them. HALF TRUE, and the wrong half. Verified:
//
//     const B = () => undefinedPlainIdentifier   → no-undef catches this
//     const A = () => <Undefined1 />             → NOTHING catches this
//
// Core eslint does not resolve JSX element names. The rule that does is
// `react/jsx-no-undef`, which lives in `eslint-plugin-react` — a dependency
// this project does not have, and adding one to a shared package.json is the
// team's call, not a side effect of a bug fix.
//
// So: forty lines of string handling that need no dependency at all, and that
// run the same way as every other check in this module.
//
//     node src/utils/checkJsxImports.js          # exits non-zero on a finding
//
// If `eslint-plugin-react` is ever added, delete this file and put
// `'react/jsx-no-undef': 'error'` in eslint.config.js instead — a real parser
// beats a regex, and this one is deliberately conservative rather than clever.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Names that are elements, not components, and names React itself provides.
const BUILT_IN = new Set(['Fragment'])

const walk = (dir, out = []) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            if (entry.name === 'node_modules' || entry.name === 'assets') continue
            walk(full, out)
        } else if (entry.name.endsWith('.jsx')) {
            out.push(full)
        }
    }
    return out
}

// Strip comments and strings so a component name inside one is not mistaken
// for a usage. Crude on purpose: a false NEGATIVE here just means the script
// says nothing, while a false positive would train people to ignore it.
const strip = (source) => source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``')

/** Component names used as JSX elements: <Thing>, <Thing.Sub>, </Thing>. */
export const jsxComponentsUsed = (source) => {
    const used = new Set()
    const re = /<\s*([A-Z][A-Za-z0-9_]*)/g
    let m
    while ((m = re.exec(source)) !== null) used.add(m[1])
    return used
}

/** Every name the file brings into scope: imports, const/let/function/class. */
export const namesInScope = (source) => {
    const names = new Set()

    // import X, { a as b, c } from '...'   /   import * as NS from '...'
    const importRe = /import\s+([^'"]+?)\s+from\s+['"][^'"]+['"]/g
    let m
    while ((m = importRe.exec(source)) !== null) {
        const clause = m[1]
        const braces = clause.match(/\{([^}]*)\}/)
        if (braces) {
            braces[1].split(',').forEach(part => {
                const name = part.includes(' as ') ? part.split(' as ')[1] : part
                const clean = name.trim()
                if (clean) names.add(clean)
            })
        }
        const outside = clause.replace(/\{[^}]*\}/g, '').replace(/\*\s+as\s+/g, '')
        outside.split(',').forEach(part => {
            const clean = part.trim()
            if (clean) names.add(clean)
        })
    }

    // Declarations in the file itself.
    const declRe = /(?:^|\n)\s*(?:export\s+)?(?:const|let|var|function|class)\s+([A-Za-z0-9_$]+)/g
    while ((m = declRe.exec(source)) !== null) names.add(m[1])

    // Destructured consts: const { A, B } = ...
    const destructureRe = /(?:^|\n)\s*(?:export\s+)?const\s*\{([^}]*)\}\s*=/g
    while ((m = destructureRe.exec(source)) !== null) {
        m[1].split(',').forEach(part => {
            const name = part.includes(':') ? part.split(':')[1] : part
            const clean = name.trim()
            if (clean) names.add(clean)
        })
    }

    // A component received as a PROP and renamed on the way in:
    //
    //     ({ icon: Icon = FileText }) => <Icon size={48} />
    //
    // `Icon` is a parameter, not an import, and the first version of this
    // script called it undefined — its one and only false positive across the
    // whole module. One false positive is all it takes for a checker to be
    // ignored, so it is worth the four lines.
    const renamedRe = /:\s*([A-Z][A-Za-z0-9_]*)\s*(?:=[^,}]*)?[,}]/g
    while ((m = renamedRe.exec(source)) !== null) names.add(m[1])

    return names
}

export const findMissing = (source) => {
    // Imports are read from the ORIGINAL source and usages from the stripped
    // copy. The first version read both from the stripped copy — and `strip`
    // blanks string literals, which turns `from './Spinner.jsx'` into
    // `from ''` and stops the import regex matching anything at all. It
    // reported 459 undefined components across 93 files, i.e. every component
    // in the module, which is the kind of result that gets a checker deleted
    // rather than fixed.
    const scope = namesInScope(source)
    const clean = strip(source)
    return [...jsxComponentsUsed(clean)]
        .filter(name => !BUILT_IN.has(name))
        // `<React.Suspense>` only needs `React`.
        .filter(name => !scope.has(name.split('.')[0]))
        .filter(name => !scope.has(name))
}

const files = walk(SRC)
let findings = 0
for (const file of files) {
    const missing = findMissing(fs.readFileSync(file, 'utf8'))
    if (missing.length) {
        findings += missing.length
        console.error(`✗ ${path.relative(SRC, file)} uses ${missing.map(n => `<${n}>`).join(', ')} without defining or importing it`)
    }
}

if (findings) {
    console.error(`\n${findings} undefined JSX component${findings === 1 ? '' : 's'} across ${files.length} files.`)
    process.exitCode = 1
} else {
    console.log(`✓ every JSX component is defined — ${files.length} files checked.`)
}
