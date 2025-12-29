import bcrypt from 'bcryptjs';
import { db } from './db.js';
import { ACCOUNTS_PATH, SETTINGS_PATH, getUserDataPath } from '../config/index.js';
import { logger } from './db.js';
import fs from 'fs';
import { USER_LEVEL } from '../../common/constants.js';

/**
 * 账户管理服务
 */
class AccountService {
    constructor() {
        this.accounts = [];
        this.load();
    }

    load() {
        this.accounts = db.read(ACCOUNTS_PATH, []);
    }

    save() {
        db.write(ACCOUNTS_PATH, this.accounts);
    }

    getAll() {
        return this.accounts.map(({ password, ...u }) => u);
    }

    findByUsername(username) {
        return this.accounts.find(u => u.username === username);
    }

    create(username, password, level) {
        const settings = db.read(SETTINGS_PATH, {});
        const hashedPassword = bcrypt.hashSync(password, 10);
        const newUser = {
            username,
            password: hashedPassword,
            level: level || settings.defaultUserLevel || USER_LEVEL.USER,
            createdAt: new Date().toISOString()
        };
        this.accounts.push(newUser);
        this.save();
        return newUser;
    }

    update(oldUsername, { newUsername, password, level }) {
        const index = this.accounts.findIndex(u => u.username === oldUsername);
        if (index === -1) return null;

        const user = this.accounts[index];
        if (level !== undefined) user.level = level;
        if (password) user.password = bcrypt.hashSync(password, 10);

        if (newUsername && newUsername !== oldUsername) {
            if (this.findByUsername(newUsername)) return { error: '用户名已占用' };

            const oldPath = getUserDataPath(oldUsername);
            const newPath = getUserDataPath(newUsername);
            if (fs.existsSync(oldPath)) {
                fs.renameSync(oldPath, newPath);
            }
            user.username = newUsername;
        }

        this.save();
        return user;
    }

    delete(username) {
        const index = this.accounts.findIndex(u => u.username === username);
        if (index === -1) return false;

        const dataPath = getUserDataPath(username);
        if (fs.existsSync(dataPath)) {
            fs.unlinkSync(dataPath);
        }

        this.accounts.splice(index, 1);
        this.save();
        return true;
    }
}

export const accountService = new AccountService();
