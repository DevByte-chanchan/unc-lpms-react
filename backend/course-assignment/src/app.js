/**
 * Course Assignment backend service
 */
require('dotenv').config()
const express = require('express')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json())

// health check
app.get('/health', (req, res) => res.json({ ok: true, service: 'course-assignment' }))

// placeholder routes
app.get('/api/courses', (req, res) => res.json({ courses: [] }))

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
  console.log(`Course Assignment service listening on ${PORT}`)
})
