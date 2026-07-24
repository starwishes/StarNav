import { consumeBootstrapPasswordFile } from '../services/identity/adminBootstrapService.js'

const record = consumeBootstrapPasswordFile()

if (!record) {
  console.error('未找到有效的管理员初始密码文件，可能已过期、已被读取，或从未生成。')
  process.exit(1)
}

console.log(`管理员账户: ${record.username}`)
console.log(`初始密码: ${record.password}`)
console.log(`生成时间: ${record.generatedAt}`)
console.log(`过期时间: ${record.expiresAt}`)
console.log('密码文件已在本次读取后删除。')
