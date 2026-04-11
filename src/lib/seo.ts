export const SITE_URL = "https://halohome.app";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;
export const TWITTER_HANDLE = "@halohome_app";

export const absoluteUrl = (pathOrUrl: string): string => {
  if (!pathOrUrl) return SITE_URL;
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  const normalized = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${SITE_URL}${normalized}`;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export const buildFaqSchema = (faqs: FaqItem[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
});

export const buildPersonSchema = (name: string, jobTitle?: string) => ({
  "@context": "https://schema.org",
  "@type": "Person",
  name,
  ...(jobTitle ? { jobTitle } : {}),
  url: SITE_URL,
});

export const buildOrganizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Halo Home",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
});

export const buildWebsiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Halo Home",
  url: SITE_URL,
});

type ArticleSchemaOptions = {
  title: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified: string;
  authorName: string;
};

export const buildArticleSchema = ({
  title,
  description,
  path,
  datePublished,
  dateModified,
  authorName,
}: ArticleSchemaOptions) => ({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: title,
  description,
  image: [DEFAULT_OG_IMAGE],
  author: {
    "@type": "Person",
    name: authorName,
    url: SITE_URL,
  },
  publisher: {
    "@type": "Organization",
    name: "Halo Home",
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/logo.png`,
    },
  },
  datePublished,
  dateModified,
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": `${SITE_URL}${path}`,
  },
  url: `${SITE_URL}${path}`,
});
