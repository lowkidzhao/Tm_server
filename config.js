export default {
	PORT: process.env.PORT,
	// 数据库路径
	path: "./DB/",
	// 统一路径分隔符
	LOG_DIR: process.platform === "win32" ? "logs" : "/var/log/talkme",
	// Windows需要处理特殊权限
	FILE_PERMISSION: process.platform === "win32" ? 0o666 : 0o644,
	// 服务器配置
	SOCKET_SETTINGS: {
		transports: ["websocket"],
		allowEIO3: true,
		pingTimeout: 50000,
		pingInterval: 15000,
		maxHttpBufferSize: 1e8,
		cors: {
			origin: "*",
			methods: ["GET", "POST"],
		},
	},
};
