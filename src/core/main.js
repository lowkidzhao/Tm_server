import logger from "../log/logger.js";
/**
 * 用户认证相关 API 接口
 * @param {Socket} socket - Socket 连接实例
 * @param {Map<string, string>} userAliasMap - 用户名到 socket.id 的映射
 * @param {Map<string, string>} socketMap - socket.id 到用户名的映射
 * @param {Object} dataSql - 数据库操作对象
 */
export default function main(socket, userAliasMap, socketMap, dataSql) {
	// 获取所有用户列表
	socket.on("getAll", (data) => {
		try {
			const all = dataSql.getAllUsers.all();
			if (!all) {
				socket.emit("getAll", []);
				return;
			}
			// 映射为仅包含 name 字段的数组
			const nameArray = all.map((item) => item.name);
			socket.emit("getAll", nameArray);
		} catch (err) {
			logger.error("获取所有用户失败:", err);
			socket.emit("getAll", { error: "获取用户列表失败" });
		}
	});
	// 获取在线用户列表
	socket.on("onlineUsers", (data) => {
		try {
			const onlineUsers = Array.from(userAliasMap.keys());
			io.emit("onlineUsers", onlineUsers); // 改用 io 广播
		} catch (err) {
			logger.error("获取在线用户失败:", err);
			socket.emit("onlineUsers", { error: "获取在线用户失败" });
		}
	});
}
