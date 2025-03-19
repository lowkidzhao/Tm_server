import os from "os";
import logger from "./log/logger.js";
import { createIoServer, Start } from "./core/server.js";
import config from "../config.js";
import Database from "better-sqlite3"; // 修改导入方式
import { dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// 检查操作系统
if (os.platform() === "win32") {
	logger.info("运行在Windows系统");
} else {
	// Linux系统需要检查权限
	if (process.getuid() !== 0) {
		logger.warn("建议使用root权限运行服务");
	}
}
// 启动服务器时传递配置
const server = createIoServer(config.PORT, {
	...config.SOCKET_SETTINGS,
	// 可以在此扩展其他配置
});
// 在数据库连接代码前添加目录创建逻辑
const dbPath = config.path;
try {
	// 添加目录存在判断
	if (!fs.existsSync(dbPath)) {
		fs.mkdirSync(dbPath, { recursive: true, mode: 0o755 });
		logger.info(`数据库目录已创建：${dbPath}`);
	}
} catch (err) {
	logger.error(`无法创建数据库目录：${err.message}`);
	process.exit(1);
}

// 添加单例检查
if (!fs.existsSync(config.path + "TMserver.db")) {
	logger.info("首次创建数据库文件");
}

// 修改数据库连接部分
let db;
try {
	// 添加数据库文件锁检查
	if (fs.existsSync(config.path + "TMserver.db")) {
		const fd = fs.openSync(config.path + "TMserver.db", "r+");
		fs.closeSync(fd);
	}

	db = new Database(config.path + "TMserver.db");
	logger.info("Connected to TMserver.db successfully");

	// 添加数据库连接保活机制
	setInterval(() => db.pragma("optimize"), 3600000); // 每小时优化数据库
} catch (err) {
	logger.error(`数据库连接失败: ${err.message}`);
	process.exit(1); // 明确退出进程
}

// 执行初始化SQL
// 用户表
db.prepare(
	`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        password TEXT NOT NULL
    )
`
).run();

// 验证码存储表
db.prepare(
	`
    CREATE TABLE IF NOT EXISTS verification (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        name TEXT NOT NULL,
        code TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
`
).run();
// 房间存储表
db.prepare(
	`
    CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        password TEXT
    )
`
).run();
// 消息存储表
db.prepare(
	`
    CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        timestamp TEXT NOT NULL
    )   
`
).run();
// 启动服务器
Start(server, db);
