import { Server } from "socket.io";
import { createServer } from "http";
import express from "express";
import logger from "../log/logger.js";
import webrtcapi from "./webrtcapi.js";
import userapi from "./userapi.js";
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
export function Start(io, db) {
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
			// 调用userapi
			userapi(socket, userAliasMap, socketMap);
			// 调用webrtcapi
			webrtcapi(socket, userAliasMap, socketMap);
		});
	} catch (err) {
		logger.error("Socket.IO服务启动出错:", err);
	}
}
