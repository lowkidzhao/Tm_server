import logger from "../log/logger.js";

/**
 *  webrtcapi
 *  用于处理webrtc相关的事件
 *  包括：
 *  1. offer
 *  2. answer
 *  3. icecandidate
 * @param {socket实例} socket
 * @param {用户映射} userAliasMap
 */
export default function webrtcapi(socket, userAliasMap) {
	// 监听webrtc-offer事件（offer）
	socket.on("offer", (data) => {
		try {
			const targetSocketId = userAliasMap.get(data.name);
			if (!targetSocketId) {
				throw new Error("目标用户不存在或未登录");
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
				throw new Error("answer时目标用户不存在");
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
				throw new Error("目标用户不存在");
			}
			socket.to(targetSocketId).emit("remote-icecandidate", data.candidate);
		} catch (err) {
			logger.error("icecandidate 处理失败:", err);
			socket.emit("icecandidate", { error: err.message });
		}
	});
}
