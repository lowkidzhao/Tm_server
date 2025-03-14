export default function webrtcapi(socket, userAliasMap, socketMap) {
	// 监听webrtc-offer事件（offer）
	socket.on("offer", (data) => {
		// 定向发送给指定用户
		const targetSocketId = userAliasMap.get(data.name);
		if (!targetSocketId) {
			logger.error("目标用户不存在");
			return;
		}
		socket
			.to(targetSocketId)
			.emit("offer_get", { id: socket.id, offer: data.offer });
	});
	// 监听webrtc-answer事件（answer）
	socket.on("answer", (data) => {
		// 定向发送给指定用户
		const targetSocketId = socketMap.get(data.id);
		if (!targetSocketId) {
			logger.error("目标用户不存在");
			return;
		}
		socket.to(targetSocketId).emit("answer_get", data.answer);
	});

	socket.on("icecandidate", (data) => {
		let targetSocketId = null;
		if (data.id) {
			targetSocketId = socketMap.get(data.targetId);
		} else if (data.name) {
			targetSocketId = userAliasMap.get(data.name);
		}
		if (targetSocketId) {
			socket.to(targetSocketId).emit("remote-icecandidate", data.candidate);
		} else {
			logger.error("目标用户不存在");
		}
	});
}
