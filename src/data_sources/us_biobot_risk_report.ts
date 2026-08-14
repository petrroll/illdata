import { promises as fs } from "fs";
import path from "path";
import { getAbsolutePath } from "./ioUtils";

const BIOBOT_FEED_URL = "https://biobot.io/risk-reports/feed/";
const BIOBOT_POST_HOSTS = new Set(["biobotanalytics.substack.com", "biobot.io", "www.biobot.io"]);
const BIOBOT_IMAGE_HOSTS = new Set(["substackcdn.com", "substack-post-media.s3.amazonaws.com", "biobot.io", "www.biobot.io"]);

export interface BiobotRiskReport {
    title: string;
    postUrl: string;
    imageUrl: string;
    publishedAt: string;
}

function decodeEntities(value: string): string {
    return value
        .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
        .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&");
}

function extractTag(xml: string, tag: string): string {
    const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
    if (!match) return "";
    return decodeEntities(match[1].replace(/^<!\[CDATA\[|\]\]>$/g, "").trim());
}

function extractTags(xml: string, tag: string): string[] {
    return [...xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "gi"))]
        .map(match => decodeEntities(match[1].replace(/^<!\[CDATA\[|\]\]>$/g, "").trim()));
}

function getAttribute(tag: string, name: string): string {
    const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, "i"));
    return decodeEntities(match?.[1] ?? match?.[2] ?? "");
}

function isAllowedUrl(value: string, hosts: Set<string>): boolean {
    try {
        const url = new URL(value);
        return url.protocol === "https:" && hosts.has(url.hostname);
    } catch {
        return false;
    }
}

function extractLargestReportImage(html: string): string | undefined {
    const images = [...html.matchAll(/<img\b[^>]*>/gi)]
        .map((match, index) => {
            const tag = match[0];
            const src = getAttribute(tag, "src");
            const width = Number.parseInt(getAttribute(tag, "width"), 10) || 0;
            const height = Number.parseInt(getAttribute(tag, "height"), 10) || 0;
            return { src, area: width * height, index };
        })
        .filter(image => isAllowedUrl(image.src, BIOBOT_IMAGE_HOSTS))
        .sort((a, b) => b.area - a.area || a.index - b.index);

    return images[0]?.src;
}

export function parseLatestBiobotRiskReport(feedXml: string): BiobotRiskReport {
    const reports = [...feedXml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)]
        .map(match => {
            const item = match[1];
            const title = extractTag(item, "title");
            const postUrl = extractTag(item, "link");
            const publishedAt = new Date(extractTag(item, "pubDate"));
            const categories = extractTags(item, "category");
            const isRiskReport = /risk report/i.test(title)
                || categories.some(category => /^risk reports?$/i.test(category));
            const imageUrl = extractLargestReportImage(
                extractTag(item, "content:encoded") || extractTag(item, "description")
            );

            if (!isRiskReport || !imageUrl || !isAllowedUrl(postUrl, BIOBOT_POST_HOSTS)
                || Number.isNaN(publishedAt.getTime())) {
                return undefined;
            }

            return {
                title,
                postUrl,
                imageUrl,
                publishedAt: publishedAt.toISOString()
            };
        })
        .filter((report): report is BiobotRiskReport => report !== undefined)
        .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

    if (!reports[0]) {
        throw new Error("No Biobot risk report with a valid image was found");
    }

    return reports[0];
}

export async function downloadBiobotRiskReportFeed(filename: string = "biobot_risk_reports.xml"): Promise<void> {
    const response = await fetch(BIOBOT_FEED_URL);
    if (!response.ok) {
        throw new Error(`Failed to fetch Biobot risk report feed: ${response.statusText}`);
    }

    const content = await response.text();
    if (!content.trim()) {
        throw new Error("Fetched Biobot risk report feed is empty");
    }

    const filePath = getAbsolutePath(`./data/${filename}`);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content, "utf-8");
}
