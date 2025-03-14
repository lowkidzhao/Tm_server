import os from "os";
import logger from "./log/logger.js";
import { createIoServer, Start } from "./core/server.js";
import config from "../config.js";
import sqlite from "sqlite3";
const sqlite3 = sqlite.verbose();
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
// 连接数据库

const db = new sqlite3.Database(
	config.path + "user.db",
	sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
	(err) => {
		if (err) {
			return console.log(err.message);
		}
		console.log("connect database-user.db successfully");
	}
);
// 启动服务器
Start(server, db);
