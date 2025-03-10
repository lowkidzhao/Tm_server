import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { format } from "logform";
const { combine, timestamp, printf, colorize } = format;

// 自定义控制台输出格式
const consoleFormat = printf(({ level, message, timestamp }) => {
	return `${timestamp} [${level}]: ${message}`;
});

// 跨平台兼容路径分隔符
import config from "../../config.js";
// 创建基础logger实例
const logger = winston.createLogger({
	level: process.env.LOG_LEVEL || "info",
	format: combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), format.json()),
	transports: [
		// 控制台输出（仅开发环境）
		process.env.NODE_ENV !== "production" &&
			new winston.transports.Console({
				format: combine(colorize(), timestamp(), consoleFormat),
			}),
		// 错误日志（按天滚动）
		new DailyRotateFile({
			filename: `${config.LOG_DIR}/error-%DATE%.log`, // 修改路径
			level: "error",
			datePattern: "YYYY-MM-DD",
			zippedArchive: true,
			maxSize: "20m",
			maxFiles: "30d",
		}),
		// 全量日志（按天滚动）
		new DailyRotateFile({
			filename: `${config.LOG_DIR}/combined-%DATE%.log`, // 修改路径
			datePattern: "YYYY-MM-DD",
			zippedArchive: true,
			maxSize: "50m",
			maxFiles: "7d",
		}),
	].filter(Boolean),
	exceptionHandlers: [
		new DailyRotateFile({
			filename: `${config.LOG_DIR}/exceptions-%DATE%.log`, // 修改路径
			datePattern: "YYYY-MM-DD",
		}),
	],
});

// 处理未捕获异常
process.on("uncaughtException", (error) => {
	logger.error(`Uncaught Exception: ${error.message}`, error);
	process.exit(1);
});

export default logger;
