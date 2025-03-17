import nodemailer from "nodemailer";
import dotenv from "dotenv";
import logger from "../log/logger.js";
import ejs from "ejs";
import path from "path";

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

		return { result: true, messageId: info.messageId };
	} catch (error) {
		logger.error("邮件发送失败:", error);
		return { result: false, error: error.message };
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
		path.join(process.cwd(), "src/utitity/valid.html"),
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
		const html = await compileTemplate({ code, minutes });
		const result = await sendEmail({ to: email, subject: "验证码通知", html });
		return result;
	} catch (error) {
		logger.error("发送验证码邮件失败:", error);
	}
}
