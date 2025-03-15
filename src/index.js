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
	fs.mkdirSync(dbPath, { recursive: true, mode: 0o755 });
	logger.info(`数据库目录已创建：${dbPath}`);
} catch (err) {
	logger.error(`无法创建数据库目录：${err.message}`);
	process.exit(1);
}
// 连接数据库
let db;
try {
	db = new Database(config.path + "user.db");
	console.log("Connected to database-user.db successfully");

	// 可选：执行初始化SQL
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
} catch (err) {
	console.error("Database connection error:", err.message);
	process.exit(1);
}

// 启动服务器
Start(server, db);
