import { describe, expect, test } from "bun:test";
import { parseLatestBiobotRiskReport } from "./us_biobot_risk_report";

const feed = `
<rss xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <item>
      <title><![CDATA[Respiratory Risk Report Week ending August 1, 2026]]></title>
      <link>https://biobotanalytics.substack.com/p/latest-report?utm_source=feed&amp;utm_medium=web</link>
      <pubDate>Fri, 07 Aug 2026 12:00:00 GMT</pubDate>
      <category><![CDATA[Risk Reports]]></category>
      <content:encoded><![CDATA[
        <img src="https://substackcdn.com/image/fetch/thumbnail.png" width="1200" height="630">
        <img src="https://biobot.io/wp-content/uploads/report.png" width="4086" height="3300">
      ]]></content:encoded>
    </item>
    <item>
      <title><![CDATA[Respiratory Risk Report Week ending July 25, 2026]]></title>
      <link>https://biobotanalytics.substack.com/p/older-report</link>
      <pubDate>Fri, 31 Jul 2026 12:00:00 GMT</pubDate>
      <category><![CDATA[Risk Reports]]></category>
      <content:encoded><![CDATA[
        <img src="https://substackcdn.com/image/fetch/older.png" width="5000" height="4000">
      ]]></content:encoded>
    </item>
  </channel>
</rss>`;

describe("parseLatestBiobotRiskReport", () => {
    test("selects the newest risk report and its largest image", () => {
        expect(parseLatestBiobotRiskReport(feed)).toEqual({
            title: "Respiratory Risk Report Week ending August 1, 2026",
            postUrl: "https://biobotanalytics.substack.com/p/latest-report?utm_source=feed&utm_medium=web",
            imageUrl: "https://biobot.io/wp-content/uploads/report.png",
            publishedAt: "2026-08-07T12:00:00.000Z"
        });
    });

    test("does not require category labels in the dedicated risk report feed", () => {
        const feedWithoutCategory = feed.replace(
            "<![CDATA[Risk Reports]]>",
            "<![CDATA[Company News]]>"
        ).replace(
            "Respiratory Risk Report Week ending August 1, 2026",
            "Biobot company update"
        );

        expect(parseLatestBiobotRiskReport(feedWithoutCategory).postUrl)
            .toBe("https://biobotanalytics.substack.com/p/latest-report?utm_source=feed&utm_medium=web");
    });

    test("rejects feeds without a safe report image", () => {
        const unsafe = feed
            .replace(/https:\/\/substackcdn\.com\/image\/fetch\/thumbnail\.png/g, "javascript:alert(1)")
            .replace(/https:\/\/biobot\.io\/wp-content\/uploads\/report\.png/g, "https://example.com/report.png")
            .replace(/https:\/\/substackcdn\.com\/image\/fetch\/older\.png/g, "https://example.com/older.png");

        expect(() => parseLatestBiobotRiskReport(unsafe))
            .toThrow("No Biobot risk report with a valid image was found");
    });
});
