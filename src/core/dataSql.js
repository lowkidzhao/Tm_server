export default (db) => ({
	checkName: db.prepare("SELECT * FROM users WHERE name = :name"),
	insertUser: db.prepare(
		"INSERT INTO users (name, email, password) VALUES (:name, :email, :password)"
	),
	getUser: db.prepare("SELECT * FROM users WHERE name = :name LIMIT 1"),
	updatePassword: db.prepare(`
        UPDATE users 
        SET password = :newPassword 
        WHERE name = :name
    `),
	// 验证码插入语句
	insertValid: db.prepare(`
	    INSERT INTO verification (email, name, code, expires_at) 
	    VALUES (:email, :name, :code, datetime('now', '+1 minutes'))
	`),
	// 验证码查询语句
	getValid: db.prepare(`
	    SELECT * FROM verification WHERE email = :email AND name = :name AND code = :code
	`),
	// 验证码时效性
	checkValid: db.prepare(`
	    SELECT * FROM verification WHERE email = :email
	`),
	// 自动清理过期验证码语句
	cleanExpiredCodes: db.prepare(`
	    DELETE FROM verification 
	    WHERE expires_at < datetime('now')
	`),
});
