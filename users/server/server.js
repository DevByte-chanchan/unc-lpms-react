const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { sequelize, User_Account, Stakeholder, Stakeholder_Role, Role } = require('./models');

const app = express();
const PORT = 3001; // Users service on 3001 (composition is on 3000)
const JWT_SECRET = 'lpms_super_secret_key_2026';

app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:5174'], // Assuming clients run here
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

app.post('/api/auth/login', async (req, res) => {
    try {
        const { stakeholder_id, role, password } = req.body;

        if (!stakeholder_id || !role || !password) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        // Find Account
        const account = await User_Account.findOne({ where: { stakeholder_id } });
        if (!account) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, account.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }

        if (account.account_status !== 'Active') {
            return res.status(403).json({ message: "Account is not active" });
        }

        // Find Stakeholder
        const stakeholder = await Stakeholder.findOne({ where: { stakeholder_id } });
        if (!stakeholder) {
            return res.status(404).json({ message: "Stakeholder details not found" });
        }

        // Check assigned roles
        const shRoles = await Stakeholder_Role.findAll({
            where: { stakeholder_id, role_status: 'Active' },
            include: [{ model: Role, attributes: ['role_name'] }]
        });

        const userRoles = shRoles.map(sr => sr.Role.role_name);
        
        if (!userRoles.includes(role)) {
            return res.status(403).json({ message: `Access denied. You do not have the ${role} role.` });
        }

        // Create Token payload
        const payload = {
            stakeholder_id: stakeholder.stakeholder_id,
            first_name: stakeholder.first_name,
            last_name: stakeholder.last_name,
            role: role
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

        // Set cookie (optional, but good practice for frontend apps)
        res.cookie('token', token, { httpOnly: true, secure: false, maxAge: 8 * 60 * 60 * 1000 });

        return res.json({
            message: "Login successful",
            token,
            user: payload
        });
    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
});

app.listen(PORT, () => {
    console.log(`Users microservice running on http://localhost:${PORT}`);
});