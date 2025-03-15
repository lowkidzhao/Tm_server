export default function userapi(socket, userAliasMap, socketMap, dataSql) {
	//注册
	socket.on("register", (data) => {
		const { name, email, password } = data;
		// 校验逻辑
		if (name.length > 20 || !/^[\w-]+$/.test(name)) {
			throw new Error("用户名包含非法字符");
		}
		// 校验邮箱格式
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			throw new Error("邮箱格式不正确");
		}
		// 校验密码长度
		if (password.length < 6 || password.length > 20) {
			throw new Error("密码长度不符合要求");
		}
		try {
			const result = dataSql.checkName.all({ name: name });
			if (result.length > 0) {
				socket.emit("register", { error: "用户名已存在" });
				return;
			} else {
				// 插入新用户
				let resultinsert = dataSql.insertUser.run({
					name: name,
					email: email,
					password: password,
				});
				if (resultinsert.changes === 1) {
					socket.emit("register", {
						message: "注册成功",
						userAlias: name,
					});
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
	// 登录
	socket.on("login", (data) => {
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
		const { oldPassword, newPassword } = data;
		try {
			const name = userAliasMap.get(socket.id); // 获取当前socket.id对应的用户名
			// 验证必须已登录
			if (!name) {
				socket.emit("changePassword", { error: "请先登录" });
				return;
			}
			// 执行密码更新
			const result = dataSql.updatePassword.run({
				name: name,
				oldPassword: oldPassword,
				newPassword: newPassword,
			});
			// 错误处理
			if (result.changes === 1) {
				socket.emit("changePassword", {
					message: "密码修改成功",
				});
			} else {
				socket.emit("changePassword", {
					error: "旧密码错误或用户不存在",
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
}
