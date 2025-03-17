import nodemailer from "nodemailer";
import dotenv from "dotenv";
import logger from "../log/logger.js";
import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
const __dirname = dirname(fileURLToPath(import.meta.url));

dotenv.config();

// 创建邮件传输器
const transporter = nodemailer.createTransport({
	host: process.env.SMTP_HOST,
	port: process.env.SMTP_PORT,
	secure: true, // 使用SSL
	auth: {
		user: process.env.SMTP_USER,
		pass: process.env.SMTP_PASSWORD,
	},
});

/**
 * 发送邮件
 * @param {string} to - 收件人邮箱
 * @param {string} subject - 邮件主题
 * @param {string} [text] - 纯文本内容
 * @param {string} [html] - HTML内容
 * @param {Array} [attachments=[]] - 附件列表
 * @returns {Promise<Object>} 发送结果对象，包含成功状态和消息ID/错误信息
 */
async function sendEmail({ to, subject, text, html, attachments = [] }) {
	try {
		const info = await transporter.sendMail({
			from: `"系统通知" <${process.env.SMTP_FROM}>`,
			to,
			subject,
			text,
			html,
			attachments,
		});

		return { success: true, messageId: info.messageId };
	} catch (error) {
		logger.error("邮件发送失败:", error);
		return { success: false, error: error.message };
	}
}

/**
 * 编译邮件模板
 * @param {Object} data - 模板数据
 * @param {string} data.code - 验证码
 * @param {number} data.minutes - 有效期（分钟）
 * @returns {Promise<string>} 渲染后的HTML内容
 */
function compileTemplate(data) {
	return ejs.renderFile(
		path.join(__dirname, "valid.html"), // 修正为使用绝对路径
		data
	);
}

/**
 * 发送验证码邮件示例
 * @param {string} email - 收件人邮箱
 * @param {string} code - 验证码
 * @param {number} minutes - 验证码有效期（分钟）
 */
export async function sendVerificationCode(email, code, minutes) {
	try {
		const html = await compileTemplate({
			code: code,
			minutes: minutes,
		}).catch((err) => {
			// 添加错误捕获
			throw new Error(`模板编译失败: ${err.message}`);
		});

		const { success, error } = await sendEmail({
			to: email,
			subject: "验证码通知",
			html,
		});

		if (!success) {
			throw new Error(error || "未知邮件服务错误");
		}
		return { success: true };
	} catch (error) {
		logger.error(`验证码邮件发送失败: ${error.message}`);
		throw error;
	}
}
