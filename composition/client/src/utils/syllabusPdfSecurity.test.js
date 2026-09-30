import test from 'node:test'
import assert from 'node:assert/strict'
import { sanitizeUrl } from './sanitize.js'
import { buildSyllabusHtml } from './syllabusPdfHtml.js'

test('reference metadata is text, not executable generated syllabus markup', () => {
  const html = buildSyllabusHtml({
    references: [{
      type: 'online',
      title: '</td><script>globalThis.pwned=true</script>',
      authors: '<img src=x onerror=alert(1)>',
      link: 'javascript:alert(1)',
      year: '<svg onload=alert(1)>'
    }]
  }, 'TEST101', null, '')

  assert.equal(html.includes('<script>globalThis.pwned=true</script>'), false)
  assert.equal(html.includes('<img src=x onerror=alert(1)>'), false)
  assert.equal(html.includes('<svg onload=alert(1)>'), false)
  assert.equal(html.includes('href="javascript:'), false)
  assert.match(html, /&lt;script&gt;globalThis\.pwned=true&lt;&#x2F;script&gt;/)
})

test('reference links accept only ordinary credential-free HTTP URLs', () => {
  assert.equal(sanitizeUrl('https://library.example.edu/book?id=7'), 'https://library.example.edu/book?id=7')
  assert.equal(sanitizeUrl('http://example.edu/path'), 'http://example.edu/path')
  assert.equal(sanitizeUrl('javascript:alert(1)'), '')
  assert.equal(sanitizeUrl('data:text/html,<script>alert(1)</script>'), '')
  assert.equal(sanitizeUrl('file:///etc/passwd'), '')
  assert.equal(sanitizeUrl('https://user:secret@example.edu/path'), '')
  assert.equal(sanitizeUrl('https://example.edu/line\nbreak'), '')
})
