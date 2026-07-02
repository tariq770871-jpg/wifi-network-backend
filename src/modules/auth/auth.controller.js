const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../../shared/db');
const { JWT_SECRET } = require('../../shared/middleware/auth');
const { success, error } = require('../../shared/utils/response');

const register = async (req, res) => {
    try {
        const { username, password, full_name, role, phone, email } = req.body;
        const existing = await query('SELECT id FROM users WHERE username = $1', [username]);
        if (existing.rows.length > 0) return error(res, '\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0645\u0648\u062c\u0648\u062f \u0645\u0633\u0628\u0642\u0627\u064b', 409);
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await query(
            'INSERT INTO users (username, hashed_password, full_name, role, phone, email) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, full_name, role',
            [username, hashedPassword, full_name, role || 'technician', phone, email]
        );
        success(res, result.rows[0], '\u062a\u0645 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u062d\u0633\u0627\u0628 \u0628\u0646\u062c\u0627\u062d');
    } catch (err) { error(res, err.message, 500); }
};

const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const result = await query(
            'SELECT id, username, full_name, role, hashed_password, tracking_enabled, tracking_veto FROM users WHERE username = $1', [username]
        );
        if (result.rows.length === 0) return error(res, '\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063a\u064a\u0631 \u0635\u062d\u064a\u062d\u0629', 401);
        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.hashed_password);
        if (!validPassword) return error(res, '\u0627\u0633\u0645 \u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u0623\u0648 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u063a\u064a\u0631 \u0635\u062d\u064a\u062d\u0629', 401);
        const token = jwt.sign({ userId: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '24h' });
        delete user.hashed_password;
        success(res, { token, user }, '\u062a\u0645 \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0628\u0646\u062c\u0627\u062d');
    } catch (err) { error(res, err.message, 500); }
};

const me = async (req, res) => {
    try {
        const result = await query('SELECT id, username, full_name, role, phone, email, tracking_enabled, tracking_veto FROM users WHERE id = $1', [req.user.id]);
        success(res, result.rows[0]);
    } catch (err) { error(res, err.message, 500); }
};

const changePassword = async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        if (!current_password || !new_password) return error(res, '\u0643\u0644\u0645\u0627\u062a \u0627\u0644\u0645\u0631\u0648\u0631 \u0645\u0637\u0644\u0648\u0628\u0629', 400);
        if (new_password.length < 6) return error(res, '\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 6 \u0623\u062d\u0631\u0641 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644', 400);
        const result = await query('SELECT hashed_password FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0) return error(res, '\u0627\u0644\u0645\u0633\u062a\u062e\u062f\u0645 \u063a\u064a\u0631 \u0645\u0648\u062c\u0648\u062f', 404);
        const valid = await bcrypt.compare(current_password, result.rows[0].hashed_password);
        if (!valid) return error(res, '\u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0627\u0644\u062d\u0627\u0644\u064a\u0629 \u063a\u064a\u0631 \u0635\u062d\u064a\u062d\u0629', 401);
        const hashed = await bcrypt.hash(new_password, 10);
        await query('UPDATE users SET hashed_password = $1, updated_at = NOW() WHERE id = $2', [hashed, req.user.id]);
        success(res, null, '\u062a\u0645 \u062a\u063a\u064a\u064a\u0631 \u0643\u0644\u0645\u0629 \u0627\u0644\u0645\u0631\u0648\u0631 \u0628\u0646\u062c\u0627\u062d');
    } catch (err) { error(res, err.message, 500); }
};

module.exports = { register, login, me, changePassword };
