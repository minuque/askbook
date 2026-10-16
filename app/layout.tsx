import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Literata, Newsreader, Schibsted_Grotesk } from "next/font/google";
import { BOOT_SCRIPT } from "@/lib/settings";
import "./globals.css";
import { Tooltips } from "@/components/ui/Tooltips";
import { LocalSync } from "@/components/LocalSync";
import { OG_IMAGE, SITE_URL } from "@/lib/brand";

const serif = Newsreader({
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--nf-serif",
  display: "swap",
});

const sans = Schibsted_Grotesk({
  subsets: ["latin"],
  variable: "--nf-sans",
  display: "swap",
});

// Optional reading faces: declared here, fetched only when a reader picks them.
const book = Literata({
  subsets: ["latin", "latin-ext"],
  axes: ["opsz"],
  style: ["normal", "italic"],
  variable: "--nf-book",
  display: "swap",
  preload: false,
});

const legible = Atkinson_Hyperlegible_Next({
  subsets: ["latin", "latin-ext"],
  style: ["normal", "italic"],
  variable: "--nf-legible",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
});

const DESCRIPTION = "Highlight any line and ask it anything. An open model writes the answer in the margin, beside the words, citing the paragraphs it used.";

const SCROLL_MARK_SCRIPT = `(function(){var e=document.querySelector(".scroll-root"),t;if(!e)return;e.addEventListener("scroll",function(){e.classList.add("is-scrolling");clearTimeout(t);t=setTimeout(function(){e.classList.remove("is-scrolling")},900)},{passive:true})})()`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Gloss", template: "%s" },
  description: DESCRIPTION,
  applicationName: "Gloss",
  openGraph: { type: "website", siteName: "Gloss", title: "Gloss", description: DESCRIPTION, url: "/", images: [OG_IMAGE] },
  twitter: { card: "summary_large_image", title: "Gloss", description: DESCRIPTION, images: [OG_IMAGE.url] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#151412" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${book.variable} ${legible.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT_SCRIPT }} />
      </head>
      <body>
        <div className="scroll-root">
          {children}
          <LocalSync />
          <Tooltips />
        </div>
        {/* Marks the scroll box while it moves, so its scrollbar thumb can stay
            out of the way the rest of the time. */}
        <script dangerouslySetInnerHTML={{ __html: SCROLL_MARK_SCRIPT }} />
      </body>
    </html>
  );
}
