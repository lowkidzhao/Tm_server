import logger from "../log/logger.js";

/**
 * webrtc API 接口
 * @param {Socket} socket - Socket 连接实例
 * @param {Map<string, string>} userAliasMap - 用户名到 socket.id 的映射
 */
export default function webrtcapi(socket, userAliasMap) {
	// 监听webrtc-offer事件（offer）
	socket.on("offer", (data) => {
		try {
			const targetSocketId = userAliasMap.get(data.name);
			if (!targetSocketId) {
				socket.emit("offer", { error: "目标用户不存在或未登录" });
				return;
			}
			socket.to(targetSocketId).emit("offer_get", {
				id: socket.id,
				offer: data.offer,
			});
		} catch (err) {
			logger.error("offer 处理失败:", err);
			socket.emit("offer", { error: err.message });
		}
	});

	// 监听webrtc-answer事件（answer）
	socket.on("answer", (data) => {
		try {
			const targetSocketId = data.id;
			if (!targetSocketId) {
				socket.emit("answer", { error: "answer时目标用户不存在" });
			}
			socket.to(targetSocketId).emit("answer_get", data.answer);
		} catch (err) {
			logger.error("answer 处理失败:", err);
			socket.emit("answer", { error: err.message });
		}
	});

	socket.on("icecandidate", (data) => {
		try {
			let targetSocketId = null;
			if (data.id) {
				targetSocketId = data.id;
			} else if (data.name) {
				targetSocketId = userAliasMap.get(data.name);
			}

			if (!targetSocketId) {
				socket.emit("icecandidate", { error: "目标用户不存在" });
			}
			socket.to(targetSocketId).emit("remote-icecandidate", data.candidate);
		} catch (err) {
			logger.error("icecandidate 处理失败:", err);
			socket.emit("icecandidate", { error: err.message });
		}
	});
}
