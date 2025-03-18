import { Server } from "socket.io";
import { createServer } from "http";
import express from "express";
import logger from "../log/logger.js";
import webrtcapi from "./webrtcapi.js";
import userapi from "./userapi.js";
import sqlFactory from "./dataSql.js";
/**
 * 创建 Socket.IO 服务器实例
 * @param {number} port - 服务器监听端口
 * @param {Object} config - Socket.IO 配置项
 * @returns {Server} Socket.IO 服务器实例
 */
export function createIoServer(port, config) {
	try {
		const app = new express();
		// 修正 HTTP 服务器创建方式
		const httpServer = createServer(app);
		// 合并配置并创建唯一的 Socket.IO 实例
		const io = new Server(httpServer, config);
		// 监听底层HTTP服务器事件
		httpServer.listen(port);
		io.httpServer.on("listening", () => {
			logger.info(`服务已启动在端口:${io.httpServer.address().port}`);
		});
		// 监听错误事件
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
 * 初始化 Socket.IO 事件监听
 * @param {Server} io - Socket.IO 服务器实例
 * @param {Database} db - 数据库连接实例
 */
export function Start(io, db) {
	try {
		const dataSql = sqlFactory(db);
		// 存储用户映射关系（name <-> socket.id）
		const userAliasMap = new Map();
		const socketMap = new Map();

		io.on("connection", (socket) => {
			socket.emit("message", "Hello from Socket.IO!");
			// 调用userapi
			userapi(socket, userAliasMap, socketMap, dataSql);
			// 调用webrtcapi
			webrtcapi(socket, userAliasMap);

			// 定时清理过期验证码
			setInterval(() => {
				const deleted = dataSql.cleanExpiredCodes.run();
			}, 1 * 60 * 1000); // 每5分钟清理一次

			socket.on("timeout", () => {
				socket.disconnect();
			});
		});
	} catch (err) {
		logger.error("Socket.IO服务启动出错:", err);
	}
}
