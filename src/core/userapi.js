import logger from "../log/logger.js";
import { generateNumericCode } from "../utitity/generateCode.js";
import { sendVerificationCode } from "../utitity/email.js";
/**
 * 用户认证相关 API 接口
 * @param {Socket} socket - Socket 连接实例
 * @param {Map<string, string>} userAliasMap - 用户名到 socket.id 的映射
 * @param {Map<string, string>} socketMap - socket.id 到用户名的映射
 * @param {Object} dataSql - 数据库操作对象
 */
export default function userapi(socket, userAliasMap, socketMap, dataSql) {
	//注册
	socket.on("register", (data) => {
		// 新增空数据校验
		if (!data || typeof data !== "object") {
			socket.emit("register", { error: "无效的请求格式" });
			return;
		}
		const { name, email, password, code } = data;
		// 注册事件处理中
		try {
			// 校验逻辑
			if (name.length > 20 || name.length == 0) {
				socket.emit("register", {
					error: " 用户名在1个字符与20个字符之间",
				});
				return;
			}
			// 校验邮箱格式
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(email)) {
				socket.emit("register", { error: "邮箱格式不正确" });
				return;
			}
			// 校验密码长度
			if (password.length < 8 || password.length > 20) {
				socket.emit("register", { error: "密码长度需在8-20个字符之间" });
				return;
			}
			const nameCheckResult = dataSql.checkName.all({ name: name });

			if (nameCheckResult.length > 0) {
				socket.emit("register", { error: "用户名已存在" });
				return;
			} else {
				// 验证码
				const validResult = dataSql.getValid.get({
					email: email,
					name: name,
					code: code,
				});
				if (!validResult) {
					socket.emit("register", { error: "验证码错误或过期" });
					return;
				}
				// 插入新用户
				let resultinsert = dataSql.insertUser.run({
					name: name,
					email: email,
					password: password,
				});
				if (resultinsert.changes === 1) {
					socket.emit("register", { message: "注册成功" });
				} else {
					socket.emit("register", { error: "注册失败" });
				}
			}
			logger.info("user register__" + socket.id + "__" + name);
		} catch (err) {
			logger.error("注册出错:", err);
			socket.emit("register", { error: "注册出错" });
		}
	});
	// 验证码发送
	socket.on("createValid", async (data) => {
		const code = generateNumericCode();
		try {
			// 添加字段验证
			if (!data) {
				throw new Error("请求数据不能为空");
			}
			const { name = "", email = "", password = "" } = data || {};
			if (!data.email || !data.name) {
				throw new Error("邮箱和用户名不能为空");
			}
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(email)) {
				throw new Error("邮箱格式不正确");
			}
			const check = dataSql.checkValid.all({ email: email });
			if (check.length > 0) {
				socket.emit("createValid", { error: "验证码频繁" });
				return;
			}
			const dbResult = dataSql.insertValid.run({
				email: email,
				name: name,
				code: code,
			});

			if (dbResult.changes === 1) {
				const EXPIRE_MINUTES = 1; // 建议改为从配置读取
				await sendVerificationCode(data.email, code, EXPIRE_MINUTES);
				socket.emit("createValid", {
					message: "验证码发送成功",
				});
			}
		} catch (err) {
			logger.error("验证码处理失败:", {
				error: err.stack,
				data,
			});
			socket.emit("createValid", { error: err.message });
		}
	});
	// 登录
	socket.on("login", (data) => {
		if (data === null || data === undefined) {
			socket.emit("login", { error: "无效的请求格式" });
			return;
		}
		const { name, password } = data;
		try {
			const user = dataSql.getUser.get({ name: name });
			//错误处理
			if (!user) {
				socket.emit("login", { error: "用户名不存在" });
				return;
			}
			if (user.password !== password) {
				socket.emit("login", { error: "密码错误" });
				return;
			}
			// 更新用户映射
			userAliasMap.set(name, socket.id);
			socketMap.set(socket.id, name);
			// 发送登录成功消息
			socket.emit("login", {
				message: "登录成功",
				userAlias: name,
				userData: {
					id: user.id,
					email: user.email,
				},
			});
			logger.info("user login__" + socket.id + "__" + name);
		} catch (err) {
			logger.error("登录出错:", err);
			socket.emit("login", { error: "登录失败" });
		}
	});
	// 密码修改
	socket.on("changePassword", (data) => {
		// 新增空数据校验
		if (!data || typeof data !== "object") {
			socket.emit("changePassword", { error: "无效的请求格式" });
			return;
		}
		const { oldPassword, newPassword, code, name, email } = data;
		try {
			// 校验逻辑
			if (newPassword.length < 6 || newPassword.length > 20) {
				throw new Error("密码长度不符合要求");
			}
			const result = dataSql.getUser.get({ name: name });
			if (!result) {
				socket.emit("changePassword", { error: "用户名不存在" });
				return;
			}
			// 验证码
			const validResult = dataSql.getValid.get({
				email: email,
				name: name,
				code: code,
			});
			if (!validResult) {
				socket.emit("changePassword", { error: "验证码错误或过期" });
				return;
			}
			const updateResult = dataSql.updatePassword.run({
				name: name,
				newPassword: newPassword,
			});

			// 错误处理
			if (updateResult.changes === 1) {
				socket.emit("changePassword", {
					message: "密码修改成功",
				});
			} else {
				socket.emit("changePassword", {
					error: "密码修改失败",
				});
			}
		} catch (err) {
			logger.error("密码修改出错:", err);
			socket.emit("changePassword", { error: "密码修改出错" });
		}
	});
	// 断开连接
	socket.on("disconnect", () => {
		try {
			// 从映射中移除断开连接的用户
			let name = socketMap.get(socket.id);
			socketMap.delete(socket.id);
			userAliasMap.delete(name);
			logger.info("user disconnected__" + socket.id + "__" + name);
		} catch (err) {
			logger.error("断开连接出错:", err);
		}
	});
	//发起私聊
	socket.on("privateMessage", (data) => {
		// 新增空数据校验
		if (!data) {
			socket.emit("privateMessage", { error: "无效的请求格式" });
			return;
		}
		const { name, message } = data;
		try {
			// 检查目标用户是否在线
			const targetSocketId = userAliasMap.get(name);
			if (!targetSocketId) {
				socket.emit("privateMessage", { error: "目标用户不在线" });
				return;
			}
			// 发送私聊消息给目标用户
			name = socketMap.get(socket.id);
			io.to(targetSocketId).emit("getPrivateMessage", {
				success: name,
				message: "申请私聊",
			});
			socket.emit("privateMessage", "发送成功");
		} catch (err) {
			logger.error("私聊出错:", err);
			socket.emit("privateMessage", { error: "私聊出错" });
		}
	});
}
