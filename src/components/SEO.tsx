import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { absoluteUrl, DEFAULT_OG_IMAGE, SITE_URL, TWITTER_HANDLE } from "@/lib/seo";

type SeoProps = {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
  type?: "website" | "article";
  noindex?: boolean;
  structuredData?: Array<Record<string, unknown>>;
};

const SEO = ({
  title,
  description,
  canonical,
  image,
  type = "website",
  noindex = false,
  structuredData = [],
}: SeoProps) => {
  const location = useLocation();

  useEffect(() => {
    if (typeof document === "undefined") return;

    const canonicalUrl = absoluteUrl(canonical ?? location.pathname);
    const imageUrl = absoluteUrl(image ?? DEFAULT_OG_IMAGE);

    document.title = title;

    const setMeta = (attr: "name" | "property", key: string, content?: string) => {
      if (!content) return;
      let tag = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, key);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
      tag.setAttribute("data-seo-managed", "true");
    };

    const setLink = (rel: string, href?: string) => {
      if (!href) return;
      let link = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", rel);
        document.head.appendChild(link);
      }
      link.setAttribute("href", href);
      link.setAttribute("data-seo-managed", "true");
    };

    setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:type", type);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:image", imageUrl);
    setMeta("property", "og:site_name", "Halo Home");
    setMeta("property", "og:locale", "en_US");
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:site", TWITTER_HANDLE);
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", imageUrl);
    setLink("canonical", canonicalUrl);

    const robotsContent = noindex ? "noindex, nofollow" : undefined;
    if (robotsContent) {
      setMeta("name", "robots", robotsContent);
    } else {
      const robotsTag = document.head.querySelector('meta[name="robots"][data-seo-managed="true"]');
      if (robotsTag) robotsTag.remove();
    }

    // Ensure base domain is set for OpenGraph if needed
    setMeta("property", "og:url", canonicalUrl);
  }, [canonical, description, image, location.pathname, noindex, title, type]);

  if (!structuredData.length) return null;

  return (
    <>
      {structuredData.map((schema, index) => (
        <script
          key={`${title}-schema-${index}`}
          type="application/ld+json"
          data-seo-jsonld="true"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
};

export default SEO;
