/**
 * 生成指定长度的数字验证码
 * @param {number} length - 验证码长度，默认4位
 * @returns {string} 数字验证码字符串
 */
export function generateNumericCode(length = 4) {
	const min = Math.pow(10, length - 1);
	const max = Math.pow(10, length) - 1;
	return Math.floor(min + Math.random() * (max - min + 1)).toString();
}
/**
 * 生成包含字母的数字验证码（更安全）
 * @param {number} length - 验证码长度，默认5位
 * @returns {string} 包含数字和大写字母的验证码
 */
export function generateMixedCode(length = 5) {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 排除易混淆字符
	return Array.from(
		{ length },
		() => chars[Math.floor(Math.random() * chars.length)]
	).join("");
}
