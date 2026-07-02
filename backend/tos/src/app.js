/**
 * TOS (Teaching Outcome Standards) backend service
 */
require('dotenv').config()
const express = require('express')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

// health check
app.get('/health', (req, res) => res.json({ ok: true, service: 'tos' }))

// placeholder routes
app.get('/api/standards', (req, res) => res.json({ standards: [] }))

const PORT = process.env.PORT || 4004
app.listen(PORT, () => {
  console.log(`TOS service listening on ${PORT}`)
})
