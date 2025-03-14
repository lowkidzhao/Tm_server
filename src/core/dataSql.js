export default (db) => ({
	checkName: db.prepare("SELECT * FROM users WHERE name = :name"),
	insertUser: db.prepare(
		"INSERT INTO users (id, name, email, password) VALUES (:id, :name, :email, :password)"
	),
	getUser: db.prepare("SELECT * FROM users WHERE name = :name LIMIT 1"),
	updatePassword: db.prepare(`
        UPDATE users 
        SET password = :newPassword 
        WHERE name = :name AND password = :oldPassword
    `),
});
