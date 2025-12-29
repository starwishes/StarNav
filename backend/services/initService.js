import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { db, logger } from './db.js';
import {
    DATA_DIR,
    ACCOUNTS_PATH,
    SETTINGS_PATH,
    DEFAULT_ADMIN_NAME
} from '../config/index.js';
import { accountService } from './accountService.js';

/**
 * 系统初始化服务
 */
export const initService = {
    init() {
        logger.info('正在初始化系统...');

        db.ensureDir(DATA_DIR);
        db.ensureDir(path.join(DATA_DIR, 'users'));
        db.ensureDir(path.join(DATA_DIR, 'uploads'));

        const dataPath = path.join(DATA_DIR, 'data.json');
        const oldAdminDataPath = path.join(DATA_DIR, 'users', `${DEFAULT_ADMIN_NAME}.json`);

        if (!fs.existsSync(dataPath)) {
            if (fs.existsSync(oldAdminDataPath)) {
                // 执行迁移：从 users/{name}.json 搬迁到 data.json
                try {
                    fs.copyFileSync(oldAdminDataPath, dataPath);
                    // 备份旧文件，但不立即删除，确保安全
                    fs.renameSync(oldAdminDataPath, oldAdminDataPath + '.bak');
                    logger.info(`[Migration] 成功将主管理员旧数据从 ${oldAdminDataPath} 迁移至 ${dataPath}`);
                } catch (err) {
                    logger.error(`[Migration] 数据迁移失败: ${err.message}`);
                }
            } else {
                // 真正的数据缺失，创建默认值
                const defaultData = {
                    categories: [{ id: 1, name: '常用推荐', private: false, level: 0 }],
                    items: [{ id: 1, name: 'Google', url: 'https://www.google.com', categoryId: 1, pinned: true }]
                };
                db.write(dataPath, defaultData);
                logger.info('已创建默认数据文件 data.json');
            }
        }

        if (!fs.existsSync(SETTINGS_PATH)) {
            const defaultSettings = { registrationEnabled: false, defaultUserLevel: 1, backgroundUrl: '' };
            db.write(SETTINGS_PATH, defaultSettings);
            logger.info('已创建默认设置文件 settings.json');
        }

        this.initAdminAccount();
    },

    initAdminAccount() {
        const adminUsername = DEFAULT_ADMIN_NAME;
        const rawAdminPassword = process.env.ADMIN_PASSWORD;
        let accounts = db.read(ACCOUNTS_PATH, []);
        let adminUser = accounts.find(u => u.username === adminUsername);

        let shouldReset = false;
        let isDefault = false;
        let isNew = false;
        let reason = '';

        // 优先级 1: 账号缺失 -> 必须新建
        if (!adminUser) {
            isNew = true;
            shouldReset = true;
            reason = 'INIT';
        }

        // 优先级 2: 环境变量被显式设为危险值 'admin123' -> 强制拦截并随机化
        if (rawAdminPassword === 'admin123') {
            shouldReset = true;
            isDefault = true;
            reason = 'ENV_DANGER';
        }

        // 优先级 3: 虽无环境变量干扰，但库内密码经哈希校验仍为 'admin123' -> 强制补救
        if (!shouldReset && adminUser && bcrypt.compareSync('admin123', adminUser.password)) {
            shouldReset = true;
            isDefault = true;
            reason = 'DB_DANGER';
        }

        if (shouldReset) {
            let finalPassword = rawAdminPassword;
            let isRandom = false;

            // 如果密码是默认值，或者是因为初始化/缺失导致的 reset，且此时无备选密码，则强制随机
            if (isDefault || !finalPassword || finalPassword === 'admin123') {
                const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                finalPassword = '';
                for (let i = 0; i < 12; i++) {
                    finalPassword += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                isRandom = true;
            }

            const hashed = bcrypt.hashSync(finalPassword, 10);

            if (isNew) {
                accounts.push({
                    username: adminUsername,
                    password: hashed,
                    level: 3,
                    createdAt: new Date().toISOString()
                });
                logger.info(`管理员账户 [${adminUsername}] 初始化成功`);
            } else {
                adminUser.password = hashed;
                logger.warn(`安全预警：检测到管理员账户 [${adminUsername}] 使用危险默认密码，系统已执行强制重置`);
            }

            db.write(ACCOUNTS_PATH, accounts);
            accountService.load();

            if (isRandom) {
                console.log('\n' + '★'.repeat(50));
                console.log('🛡️  StarNav 安全初始化/强制重置');
                console.log('='.repeat(50));
                console.log('检测到当前管理员密码为默认值 "admin123"（含环境变量或存量数据）');
                console.log('出于安全理由，系统已拒绝使用该密码并为您生成了高强度密码：');
                console.log('');
                console.log(`管理员账户: ${adminUsername}`);
                console.log(`新的初始密码: ${finalPassword}`);
                console.log('');
                console.log('请务必妥善记录并在首次登录后通过后台再次修改！');
                console.log('★'.repeat(50) + '\n');
            }
        } else {
            // 场景 4: 用户通过环境变量主动申请修改密码 (非 admin123)
            if (rawAdminPassword && !bcrypt.compareSync(rawAdminPassword, adminUser.password)) {
                adminUser.password = bcrypt.hashSync(rawAdminPassword, 10);
                db.write(ACCOUNTS_PATH, accounts);
                accountService.load();
                logger.info(`管理员账户 [${adminUsername}] 密码已通过环境变量成功强制更新`);
            } else {
                logger.info(`管理员账户 [${adminUsername}] 验证状态：OK`);
            }
        }
    }
};
