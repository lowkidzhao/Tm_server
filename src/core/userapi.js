export default function userapi(socket, userAliasMap, socketMap) {
	// 监听用户重命名
	socket.on("rename", (name) => {
		userAliasMap.delete(socket.userAlias);
		socket.userAlias = name;
		userAliasMap.set(socket.userAlias, socket.id);
		logger.info("user rename__" + socket.userAlias);
	});
	//获取用户信息
	socket.on("getUserInfo", () => {
		socket.emit("user-info", socket.userAlias, socket.id);
	});
	// 获取用户数量
	socket.on("getCounter", () => {
		socket.emit("user-count", io.engine.clientsCount);
		logger.info("getCounter: " + io.engine.clientsCount);
	});
}
