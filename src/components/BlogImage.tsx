import type { ImgHTMLAttributes } from "react";

const FALLBACK_BLOG_IMAGE = "/images/book-exmpl6.jpg";

type BlogImageProps = ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string;
};

const BlogImage = ({ fallbackSrc = FALLBACK_BLOG_IMAGE, onError, alt, ...props }: BlogImageProps) => (
  <img
    {...props}
    alt={alt || ""}
    onError={(event) => {
      const image = event.currentTarget;

      if (image.dataset.fallbackApplied !== "true") {
        image.dataset.fallbackApplied = "true";
        image.src = fallbackSrc;
      }

      onError?.(event);
    }}
  />
);

export default BlogImage;
