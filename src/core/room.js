import logger from "../log/logger.js";
/**
 * 用户认证相关 API 接口
 * @param {Socket} socket - Socket 连接实例
 * @param {Map<string, string>} userAliasMap - 用户名到 socket.id 的映射
 * @param {Map<string, string>} socketMap - socket.id 到用户名的映射
 * @param {Object} dataSql - 数据库操作对象
 */
export default function main(socket, userAliasMap, socketMap, dataSql, io) {
	// 创建房间
	socket.on("newroom", (data) => {
		try {
			if (!data) {
				socket.emit("newroom", { error: "房间名不能为空" }); // 发送错误消息给客户端
				return; // 终止函数执行
			}
			const { name, password } = data; // 解构数据
			const num = dataSql.checkRoomName.get({ name: name }); // 执行数据库操作
			if (num) {
				socket.emit("newroom", { error: "房间名已存在" }); // 发送错误消息给客户端
				return;
			}
			const result = dataSql.createRoom.run({ name, password }); // 执行数据库操作
			if (result.changes > 0) {
				// 检查是否成功插入
				socket.emit("newroom", { success: "房间创建成功" }); // 发送成功消息给客户端
			} else {
				socket.emit("newroom", { error: "房间创建失败" }); // 发送错误消息给客户端
			}
		} catch (err) {
			logger.error("创建房间失败:", err); // 记录错误日志
			socket.emit("newroom", { error: "创建房间失败" }); // 发送错误消息给客户端
		}
	});
	// 删除房间
	socket.on("deleteroom", (data) => {
		try {
			if (!data) {
				socket.emit("deleteroom", { error: "房间名不能为空" }); // 发送错误消息给客户端
				return; // 终止函数执行
			}
			const { name } = data; // 解构数据
			const result = dataSql.deleteRoom.run({ name }); // 执行数据库操作
			if (result.changes > 0) {
				// 检查是否成功插入
				socket.emit("deleteroom", { success: "房间删除成功" }); // 发送成功消息给客户端
			} else {
				socket.emit("deleteroom", { error: "房间不存在" }); // 发送错误消息给客户端
			}
		} catch (err) {
			logger.error("删除房间失败:", err); // 记录错误日志
			socket.emit("deleteroom", { error: "删除房间失败" }); // 发送错误消息给客户端
		}
	});
	//获取所有房间
	socket.on("getAllroom", () => {
		try {
			const all = dataSql.getAllRooms.all(); // 执行数据库操作
			if (!all) {
				socket.emit("getAllroom", { error: "房间不存在" }); // 发送错误消息给客户端
				return; // 终止函数执行
			}
			socket.emit("getAllroom", all); // 发送成功消息给客户端
		} catch (err) {
			logger.error("获取所有房间失败:", err); // 记录错误日志
			socket.emit("getAllroom", { error: "获取房间列表失败" }); // 发送错误消息给客户端
		}
	});
	//加入房间
	socket.on("joinroom", (data) => {
		try {
			if (!data) {
				socket.emit("joinroom", { error: "房间名不能为空" }); // 发送错误消息给客户端
				return;
			}

			const { name, password } = data;
			const room = dataSql.getRoom.get({ name: name });
			if (!room) {
				socket.emit("joinroom", { error: "房间不存在" }); // 发送错误消息给客户端
				return; // 终止函数执行
			}
			// 验证房间密码
			if (room.password && room.password !== password) {
				socket.emit("joinroom", { error: "房间密码错误" });
				return;
			}
			const joinedRooms = Array.from(socket.rooms).filter(
				(room) => room !== socket.id
			); // 排除 socket 自动加入的私有房间
			if (joinedRooms.length > 0) {
				joinedRooms.forEach((roomToLeave) => {
					if (roomToLeave === room.id) {
						socket.emit("joinroom", { error: "已加入该房间" }); // 发送错误消息给客户端
						return; // 终止函数执行
					}
					socket.leave(roomToLeave);
					socket.to(roomToLeave).emit("user_left", {
						// 使用正确的房间ID变量
						success: socketMap.get(socket.id),
					});
				});
			}
			// 使用 Socket.IO 原生房间功能
			const roomId = room.id;
			socket.join(roomId); // 加入系统房间
			socket.to(roomId).emit("user_joined", {
				success: socketMap.get(socket.id),
			}); // 广播给房间成员name
			socket.emit("joinroom", { success: "加入成功" }); // 发送成功消息给客户端
		} catch (err) {
			logger.error("加入房间失败:", err);
		}
	});
	// 离开房间
	socket.on("leaveroom", (data) => {
		try {
			const joinedRooms = Array.from(socket.rooms).filter(
				(room) => room !== socket.id
			); // 排除 socket 自动加入的私有房间
			if (joinedRooms.length > 0) {
				joinedRooms.forEach((room) => {
					socket.leave(room);
					socket.to(room).emit("user_left", {
						success: socketMap.get(socket.id),
					}); // 广播给房间成员name
				});
			} else {
				socket.emit("leaveroom", { success: "未加入房间" }); // 发送错误消息给客户端
			}
			socket.emit("leaveroom", { success: "离开成功" }); // 发送成功消息给客户端
		} catch (err) {
			logger.error("离开房间失败:", err);
			socket.emit("leaveroom", { error: "离开房间失败" }); // 发送错误消息给客户端
		}
	});
	//信息广播
	socket.on("message", (data) => {
		try {
			if (!data) {
				socket.emit("message", { error: "消息不能为空" }); // 发送错误消息给客户端
				return; // 终止函数执行
			}
			const { message } = data; // 解构数据
			const joinedRooms = Array.from(socket.rooms).filter(
				(room) => room !== socket.id
			);
			const time = new Date().toLocaleString();
			const name = socketMap.get(socket.id);
			if (joinedRooms.length > 0) {
				joinedRooms.forEach((room) => {
					io.to(room).emit("newmessage", {
						message: message,
						name: name,
						time,
					}); // 广播给房间成员name
					logger.info(
						`用户 ${name} 发送消息: ${message} 到房间 ${room} at ${time}`
					);
					const result = dataSql.insertMessage.run({
						room_id: room,
						name: name,
						message,
						timestamp: time,
					});
					if (result.changes > 0) {
						// 检查是否成功插入
						logger.info("消息插入成功"); // 记录成功日志
						socket.emit("message", { success: "消息发送成功" }); // 发送成功消息给客户端
					} else {
						logger.error("消息插入失败"); // 记录错误日志
					}
				});
			} else {
				socket.emit("message", { error: "未加入任何房间" }); // 发送错误消息给客户端
				return; // 终止函数执行
			}
		} catch (err) {
			logger.error("信息广播失败:", err); // 记录错误日志
			socket.emit("message", { error: "信息广播失败" }); // 发送错误消息给客户端
		}
	});
	//获取历史消息100条
	socket.on("getMessages", (data) => {
		try {
			if (!data) {
				socket.emit("getMessages", { error: "房间名不能为空" }); // 发送错误消息给客户端
				return; // 终止函数执行
			}
			const { id } = data; // 解构数据
			const room = dataSql.getRoom.get({ room_id: id }); // 执行数据库操作
			if (!room) {
				socket.emit("getMessages", { error: "房间不存在" }); // 发送错误消息给客户端
				return; // 终止函数执行
			}
			const messages = dataSql.getMessages.all({ room_id: room.id }); // 执行数据库操作
			socket.emit("getMessages", { success: messages }); // 发送成功消息给客户端
		} catch (err) {
			logger.error("获取历史消息失败:", err); // 记录错误日志
			socket.emit("getMessages", { error: "获取历史消息失败" }); // 发送错误消息给客户端
		}
	});
	//查看当前房间
	socket.on("getCurrentRoom", (data) => {
		try {
			const joinedRooms = Array.from(socket.rooms).filter(
				(room) => room !== socket.id
			); // 排除 socket 自动加入的私有房间
			if (joinedRooms.length > 0) {
				const room = dataSql.getRoomById.get({ id: joinedRooms[0] }); // 执行数据库操作
				socket.emit("getCurrentRoom", { success: joinedRooms }); // 发送成功消息给客户端
			}
		} catch (err) {
			logger.error("查看当前房间失败:", err); // 记录错误日志
			socket.emit("getCurrentRoom", { error: "查看当前房间失败" }); // 发送错误消息给客户端
		}
	});
	//获取指定房间人数
	socket.on("getRoomUsers", (data) => {
		try {
			if (!data) {
				socket.emit("getRoomUsers", { error: "房间名不能为空" }); // 发送错误消息给客户端
				return; // 终止函数执行
			}
			const roomId = data.id;
			const room = io.sockets.adapter.rooms.get(roomId);
			if (!room) {
				socket.emit("getRoomUsers", { error: "房间不存在" }); // 发送错误消息给客户端
				return; // 终止函数执行
			}
			const users = Array.from(room).map((socketId) => ({
				socketId,
				username: socketMap.get(socketId),
			}));
			socket.emit("getRoomUsers", { success: users }); // 发送成功消息给客户端
		} catch (err) {
			logger.error("获取房间用户失败:", err); // 记录错误日志
			socket.emit("getRoomUsers", { error: "获取房间用户失败" }); // 发送错误消息给客户端
		}
	});
}
