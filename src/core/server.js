import { Server } from "socket.io";
import { createServer } from "http";
import express from "express";
import logger from "../log/logger.js";
import webrtcapi from "./webrtcapi.js";
import userapi from "./userapi.js";
import sqlFactory from "./dataSql.js";
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
		// 监听底层HTTP服务器事件
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
 * 载入监听服务
 * @param {服务器实例} io
 */
export function Start(io, db) {
	try {
		const dataSql = sqlFactory(db); // 传入数据库实例
		// 存储用户映射关系
		const userAliasMap = new Map(); // name -> socket.id
		const socketMap = new Map(); // socket.id -> name

		io.on("connection", (socket) => {
			// 调用userapi
			userapi(socket, userAliasMap, socketMap, dataSql);
			// 调用webrtcapi
			webrtcapi(socket, userAliasMap);

			socket.on("timeout", () => {
				socket.disconnect();
			});
			// 心跳
			socket.on("heartbeat", () => {
				socket.emit("heartbeat");
			});
		});
	} catch (err) {
		logger.error("Socket.IO服务启动出错:", err);
	}
}
