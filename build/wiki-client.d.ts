export interface WikiSearchResult {
    title: string;
    snippet: string;
    url: string;
}
export interface WikiPage {
    title: string;
    content: string;
    url: string;
    categories: string[];
    lastModified?: string;
}
export interface WikiCategory {
    name: string;
    url: string;
    pageCount?: number;
}
/**
 * Search the TouchDesigner wiki using MediaWiki's search API
 */
export declare function searchWiki(query: string, limit?: number): Promise<WikiSearchResult[]>;
/**
 * Get a specific wiki page by title
 */
export declare function getWikiPage(title: string): Promise<WikiPage>;
/**
 * Get wiki page content via the API (cleaner, text-only)
 */
export declare function getWikiPageContent(title: string): Promise<WikiPage>;
/**
 * List pages in a category
 */
export declare function getCategoryPages(category: string, limit?: number): Promise<WikiSearchResult[]>;
/**
 * Get all available categories
 */
export declare function getCategories(limit?: number): Promise<WikiCategory[]>;
/**
 * Get information about a specific operator (CHOP, TOP, SOP, etc.)
 */
export declare function getOperatorInfo(operatorName: string): Promise<WikiPage>;
