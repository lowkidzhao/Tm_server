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
	// 获取所有用户信息
	getAllUsers: db.prepare(`SELECT * FROM users`),
	//获取所有房间信息
	getAllRooms: db.prepare(`SELECT * FROM rooms`),
	//检测重名房间
	checkRoomName: db.prepare(`SELECT * FROM rooms WHERE name = :name`),
	//创建房间
	createRoom: db.prepare(
		`INSERT INTO rooms (name, password) VALUES (:name, COALESCE(:password, ''))`
	),
	//删除房间
	deleteRoom: db.prepare(`DELETE FROM rooms WHERE name = :name`),
	//获取指定房间
	getRoom: db.prepare(`SELECT * FROM rooms WHERE name = :name`),
	//使用id
	getRoomById: db.prepare(`SELECT * FROM rooms WHERE id = :id`),
	//聊天
	insertMessage: db.prepare(`
    INSERT INTO messages (room_id, user_id, message, timestamp) VALUES (:room_id, :user_id, :message, datetime('now'))
  `),
	getMessages: db.prepare(`
    SELECT * FROM messages WHERE room_id = :room_id ORDER BY timestamp DESC LIMIT 100
  `),
});
