export interface Category {
    id: number;
    name: string;
    private?: boolean;
    level?: number;
}

export interface Item {
    id: number;
    name: string;
    url: string;
    description: string;
    categoryId: number;
    private?: boolean;
    pinned?: boolean;
    level?: number;
}

export interface SiteConfig {
    categories: Category[];
    items: Item[];
}
