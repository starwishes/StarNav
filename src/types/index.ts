export interface Category {
    id: number;
    name: string;
    private?: boolean;
}

export interface Item {
    id: number;
    name: string;
    url: string;
    description: string;
    categoryId: number;
    private?: boolean;
}

export interface SiteConfig {
    categories: Category[];
    items: Item[];
}
