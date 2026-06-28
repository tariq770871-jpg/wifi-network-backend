const { query } = require('../../shared/db');
const { success, error } = require('../../shared/utils/response');

const getAll = async (req, res) => {
    try {
        const { status, priority, assigned_to } = req.query;
        let sql = `
            SELECT t.*, 
                creator.full_name as creator_name,
                technician.full_name as technician_name
            FROM tickets t
            LEFT JOIN users creator ON t.created_by = creator.id
            LEFT JOIN users technician ON t.assigned_to = technician.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (status) {
            sql += ` AND t.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }
        if (priority) {
            sql += ` AND t.priority = $${paramIndex}`;
            params.push(priority);
            paramIndex++;
        }
        if (assigned_to) {
            sql += ` AND t.assigned_to = $${paramIndex}`;
            params.push(assigned_to);
            paramIndex++;
        }

        sql += ' ORDER BY t.created_at DESC';

        const result = await query(sql, params);
        success(res, result.rows);
    } catch (err) {
        error(res, err.message, 500);
    }
};

const getById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query(`
            SELECT t.*, 
                creator.full_name as creator_name,
                technician.full_name as technician_name
            FROM tickets t
            LEFT JOIN users creator ON t.created_by = creator.id
            LEFT JOIN users technician ON t.assigned_to = technician.id
            WHERE t.id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return error(res, 'البلاغ غير موجود', 404);
        }
        success(res, result.rows[0]);
    } catch (err) {
        error(res, err.message, 500);
    }
};

const create = async (req, res) => {
    try {
        const { title, description, customer_name, customer_phone, customer_address, location_lat, location_lng, priority } = req.body;
        const result = await query(
            'INSERT INTO tickets (title, description, customer_name, customer_phone, customer_address, location_lat, location_lng, priority, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
            [title, description, customer_name, customer_phone, customer_address, location_lat, location_lng, priority || 'medium', req.user.id]
        );
        success(res, result.rows[0], 'تم إنشاء البلاغ بنجاح');
    } catch (err) {
        error(res, err.message, 500);
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, status, priority, assigned_to, customer_name, customer_phone, customer_address } = req.body;

        const result = await query(
            'UPDATE tickets SET title = COALESCE($1, title), description = COALESCE($2, description), status = COALESCE($3, status), priority = COALESCE($4, priority), assigned_to = COALESCE($5, assigned_to), customer_name = COALESCE($6, customer_name), customer_phone = COALESCE($7, customer_phone), customer_address = COALESCE($8, customer_address), updated_at = NOW() WHERE id = $9 RETURNING *',
            [title, description, status, priority, assigned_to, customer_name, customer_phone, customer_address, id]
        );

        if (result.rows.length === 0) {
            return error(res, 'البلاغ غير موجود', 404);
        }
        success(res, result.rows[0], 'تم تحديث البلاغ بنجاح');
    } catch (err) {
        error(res, err.message, 500);
    }
};

const assign = async (req, res) => {
    try {
        const { id } = req.params;
        const { technician_id } = req.body;

        const result = await query(
            'UPDATE tickets SET assigned_to = $1, status = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
            [technician_id, 'assigned', id]
        );

        success(res, result.rows[0], 'تم تعيين الفني بنجاح');
    } catch (err) {
        error(res, err.message, 500);
    }
};

const startWork = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query(
            'UPDATE tickets SET status = $1, started_at = NOW(), updated_at = NOW() WHERE id = $2 RETURNING *',
            ['in_progress', id]
        );
        success(res, result.rows[0], 'تم بدء العمل على البلاغ');
    } catch (err) {
        error(res, err.message, 500);
    }
};

const complete = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const result = await query(
            'UPDATE tickets SET status = $1, completed_at = NOW(), updated_at = NOW(), description = COALESCE(description, '''') || $2 WHERE id = $3 RETURNING *',
            ['completed', notes ? '\n\nملاحظات الإكمال: ' + notes : '', id]
        );
        success(res, result.rows[0], 'تم إكمال البلاغ بنجاح');
    } catch (err) {
        error(res, err.message, 500);
    }
};

const deleteTicket = async (req, res) => {
    try {
        const { id } = req.params;
        await query('DELETE FROM tickets WHERE id = $1', [id]);
        success(res, null, 'تم حذف البلاغ');
    } catch (err) {
        error(res, err.message, 500);
    }
};

module.exports = { getAll, getById, create, update, assign, startWork, complete, delete: deleteTicket };
