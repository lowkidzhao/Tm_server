import { Server } from "socket.io";
import { createServer } from "http";
import express from "express";
import logger from "../log/logger.js";

/**
 * 创建服务器
 * @param {服务器端口} port
 * @returns {服务器实例}
 */
// 在createServer函数中添加路径处理
export function createIoServer(port, config) {
	try {
		const app = new express();

		// 修正 HTTP 服务器创建方式
		const httpServer = createServer(app);

		// 合并配置并创建唯一的 Socket.IO 实例
		const io = new Server(httpServer, config);

		// 修正服务器监听方式
		httpServer.listen(port, () => {
			logger.info(`服务已启动在端口:${port}`);
		});

		// 监听底层HTTP服务器事件
		io.httpServer.on("listening", () => {
			logger.info(`服务已启动在端口:${io.httpServer.address().port}`);
		});

		io.on("error", (err) => {
			logger.error("Socket.IO服务启动失败:", err);
		});
		return io;
	} catch (err) {
		logger.error("Socket.IO服务启动失败:", err);
		throw err; // 抛出错误以便外层捕获
	}
}

/**
 * 载入监听服务
 * @param {服务器实例} io
 */
export function Start(io) {
	try {
		// 存储用户映射关系
		const userAliasMap = new Map(); // 别名 -> socket.id
		const socketMap = new Map(); // socket.id -> socket

		io.on("connection", (socket) => {
			// 监听客户端连接 / 存储socket实例
			socketMap.set(socket.id, socket);
			logger.info("a user connected__" + socket.id);
			socket.userAlias = "user" + socket.id;
			// 给每个用户分配一个默认别名
			userAliasMap.set(socket.userAlias, socket.id);
			// 监听客户端断开连接
			socket.on("disconnect", () => {
				socketMap.delete(socket.id);
				logger.info("user disconnected__" + socket.id);
			});
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
			// 监听webrtc-offer事件（offer）
			socket.on("offer", (data) => {
				// 定向发送给指定用户
				const targetSocketId = userAliasMap.get(data.name);
				socket
					.to(targetSocketId)
					.emit("offer_get", { id: socket.id, offer: data.offer });
			});
			// 监听webrtc-answer事件（answer）
			socket.on("answer", (data) => {
				// 定向发送给指定用户
				const targetSocketId = socketMap.get(data.id);
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
		});
	} catch (err) {
		logger.error("Socket.IO服务启动出错:", err);
	}
}
