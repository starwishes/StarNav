import { api } from './client';

export function getStats() {
    return api.get('/stats');
}

export function recordVisit(url) {
    return api.post('/visit', { url });
}
