import { parse } from "node-html-parser";

const BASE_URL = "https://docs.derivative.ca";

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
export async function searchWiki(
  query: string,
  limit: number = 10
): Promise<WikiSearchResult[]> {
  const searchUrl = `${BASE_URL}/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=${limit}&format=json`;

  const response = await fetch(searchUrl);
  if (!response.ok) {
    throw new Error(`Wiki search failed: ${response.statusText}`);
  }

  const data = await response.json();
  const results: WikiSearchResult[] = [];

  if (data.query?.search) {
    for (const item of data.query.search) {
      results.push({
        title: item.title,
        snippet: stripHtml(item.snippet),
        url: `${BASE_URL}/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
      });
    }
  }

  return results;
}

/**
 * Get a specific wiki page by title
 */
export async function getWikiPage(title: string): Promise<WikiPage> {
  // Normalize title for URL
  const normalizedTitle = title.replace(/ /g, "_");
  const pageUrl = `${BASE_URL}/${encodeURIComponent(normalizedTitle)}`;

  const response = await fetch(pageUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch page "${title}": ${response.statusText}`);
  }

  const html = await response.text();
  const root = parse(html);

  // Extract main content
  const contentDiv =
    root.querySelector("#mw-content-text") ||
    root.querySelector(".mw-parser-output");

  let content = "";
  if (contentDiv) {
    // Remove edit links, scripts, and navigation elements
    contentDiv.querySelectorAll(".mw-editsection").forEach((el) => el.remove());
    contentDiv.querySelectorAll("script").forEach((el) => el.remove());
    contentDiv.querySelectorAll(".navbox").forEach((el) => el.remove());
    contentDiv.querySelectorAll(".toc").forEach((el) => el.remove());

    content = htmlToMarkdown(contentDiv.innerHTML);
  }

  // Extract categories
  const categories: string[] = [];
  root.querySelectorAll("#mw-normal-catlinks li a").forEach((el) => {
    categories.push(el.text);
  });

  // Extract title from page
  const pageTitle =
    root.querySelector("#firstHeading")?.text || root.querySelector("h1")?.text || title;

  return {
    title: pageTitle,
    content: content.trim(),
    url: pageUrl,
    categories,
  };
}

/**
 * Get wiki page content via the API (cleaner, text-only)
 */
export async function getWikiPageContent(title: string): Promise<WikiPage> {
  const apiUrl = `${BASE_URL}/api.php?action=query&titles=${encodeURIComponent(title)}&prop=revisions|categories&rvprop=content&rvslots=main&format=json`;

  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch page "${title}": ${response.statusText}`);
  }

  const data = await response.json();
  const pages = data.query?.pages;

  if (!pages) {
    throw new Error(`Page "${title}" not found`);
  }

  const pageId = Object.keys(pages)[0];
  const page = pages[pageId];

  if (pageId === "-1") {
    throw new Error(`Page "${title}" does not exist`);
  }

  const content = page.revisions?.[0]?.slots?.main?.["*"] || "";
  const categories =
    page.categories?.map((c: { title: string }) =>
      c.title.replace("Category:", "")
    ) || [];

  return {
    title: page.title,
    content: cleanWikitext(content),
    url: `${BASE_URL}/${encodeURIComponent(title.replace(/ /g, "_"))}`,
    categories,
  };
}

/**
 * List pages in a category
 */
export async function getCategoryPages(
  category: string,
  limit: number = 50
): Promise<WikiSearchResult[]> {
  const apiUrl = `${BASE_URL}/api.php?action=query&list=categorymembers&cmtitle=Category:${encodeURIComponent(category)}&cmlimit=${limit}&format=json`;

  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch category "${category}": ${response.statusText}`);
  }

  const data = await response.json();
  const results: WikiSearchResult[] = [];

  if (data.query?.categorymembers) {
    for (const item of data.query.categorymembers) {
      results.push({
        title: item.title,
        snippet: "",
        url: `${BASE_URL}/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
      });
    }
  }

  return results;
}

/**
 * Get all available categories
 */
export async function getCategories(limit: number = 100): Promise<WikiCategory[]> {
  const apiUrl = `${BASE_URL}/api.php?action=query&list=allcategories&aclimit=${limit}&acprop=size&format=json`;

  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch categories: ${response.statusText}`);
  }

  const data = await response.json();
  const categories: WikiCategory[] = [];

  if (data.query?.allcategories) {
    for (const item of data.query.allcategories) {
      categories.push({
        name: item["*"],
        url: `${BASE_URL}/Category:${encodeURIComponent(item["*"])}`,
        pageCount: item.pages,
      });
    }
  }

  return categories;
}

/**
 * Get information about a specific operator (CHOP, TOP, SOP, etc.)
 */
export async function getOperatorInfo(operatorName: string): Promise<WikiPage> {
  // Try different common naming patterns
  const variations = [
    operatorName,
    `${operatorName} CHOP`,
    `${operatorName} TOP`,
    `${operatorName} SOP`,
    `${operatorName} DAT`,
    `${operatorName} COMP`,
    `${operatorName} MAT`,
  ];

  for (const variation of variations) {
    try {
      const page = await getWikiPage(variation);
      if (page.content && page.content.length > 100) {
        return page;
      }
    } catch {
      // Try next variation
    }
  }

  // If no direct match, search for it
  const searchResults = await searchWiki(operatorName, 5);
  if (searchResults.length > 0) {
    return await getWikiPage(searchResults[0].title);
  }

  throw new Error(`Operator "${operatorName}" not found in wiki`);
}

// Helper functions

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(dec));
}

function htmlToMarkdown(html: string): string {
  let text = html;

  // Convert headers
  text = text.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n");
  text = text.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n");
  text = text.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n");
  text = text.replace(/<h4[^>]*>(.*?)<\/h4>/gi, "#### $1\n\n");

  // Convert links
  text = text.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)");

  // Convert bold/italic
  text = text.replace(/<(strong|b)>(.*?)<\/\1>/gi, "**$2**");
  text = text.replace(/<(em|i)>(.*?)<\/\1>/gi, "*$2*");

  // Convert code
  text = text.replace(/<code>(.*?)<\/code>/gi, "`$1`");
  text = text.replace(/<pre>(.*?)<\/pre>/gis, "```\n$1\n```\n");

  // Convert lists
  text = text.replace(/<li>(.*?)<\/li>/gi, "- $1\n");
  text = text.replace(/<\/?[ou]l[^>]*>/gi, "\n");

  // Convert paragraphs and breaks
  text = text.replace(/<p[^>]*>(.*?)<\/p>/gis, "$1\n\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");

  // Remove remaining HTML tags
  text = text.replace(/<[^>]*>/g, "");

  // Clean up entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

  // Clean up whitespace
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return text;
}

function cleanWikitext(wikitext: string): string {
  let text = wikitext;

  // Remove templates that aren't useful as text
  text = text.replace(/\{\{[^{}]*\}\}/g, "");

  // Convert wiki links [[Page|Text]] -> Text
  text = text.replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2");
  text = text.replace(/\[\[([^\]]+)\]\]/g, "$1");

  // Convert external links [url text] -> text
  text = text.replace(/\[https?:\/\/[^\s\]]+\s+([^\]]+)\]/g, "$1");

  // Convert headers
  text = text.replace(/^======\s*(.+?)\s*======$/gm, "###### $1");
  text = text.replace(/^=====\s*(.+?)\s*=====$/gm, "##### $1");
  text = text.replace(/^====\s*(.+?)\s*====$/gm, "#### $1");
  text = text.replace(/^===\s*(.+?)\s*===$/gm, "### $1");
  text = text.replace(/^==\s*(.+?)\s*==$/gm, "## $1");
  text = text.replace(/^=\s*(.+?)\s*=$/gm, "# $1");

  // Convert bold/italic
  text = text.replace(/'''(.+?)'''/g, "**$1**");
  text = text.replace(/''(.+?)''/g, "*$1*");

  // Convert lists
  text = text.replace(/^\*\s+/gm, "- ");
  text = text.replace(/^#\s+/gm, "1. ");

  // Clean up extra whitespace
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return text;
}
