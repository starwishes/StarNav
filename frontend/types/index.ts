export interface Category {
    id: number;
    name: string;
    level?: number;
    content?: Item[]; // View Model Only
    isVirtual?: boolean; // Pinned category
}

export interface Item {
    id: number;
    name: string;
    url: string;
    description: string;
    categoryId: number;
    pinned?: boolean;
    level?: number;
    clickCount?: number;      // 访问次数统计
    lastVisited?: string;     // 最后访问时间
    tags?: string[];          // 标签
}


export interface SiteConfig {
    categories: Category[];
    items: Item[];
}
