import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import FairytellerChat from "./components/FairytellerChat";
import DesignTest from "./pages/DesignTest";

// Lazy load pages for better performance
const Print = lazy(() => import("./pages/Print"));
const Romantic = lazy(() => import("./pages/Romantic"));
const Indian = lazy(() => import("./pages/Indian"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const BlogTag = lazy(() => import("./pages/BlogTag"));
const BlogAdmin = lazy(() => import("./pages/BlogAdmin"));
const NotFound = lazy(() => import("./pages/NotFound"));
const LoveProportion = lazy(() => import("./pages/LoveProportion"));
const March8 = lazy(() => import("./pages/March8"));
const BookPreview = lazy(() => import("./pages/BookPreview"));
const NarutoStory = lazy(() => import("./pages/NarutoStory"));
const Wizard = lazy(() => import("./pages/Wizard"));
const CoupleGiftLanding = lazy(() => import("./pages/CoupleGiftLanding"));
const AnniversaryGiftLanding = lazy(() => import("./pages/AnniversaryGiftLanding"));
const PhotoFairyTaleLanding = lazy(() => import("./pages/PhotoFairyTaleLanding"));
const ChildGiftLanding = lazy(() => import("./pages/ChildGiftLanding"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center bg-white">
    <div className="h-10 w-10 animate-spin border-2 border-black border-t-transparent" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<DesignTest />} />
            <Route path="/create" element={<DesignTest />} />
            <Route path="/podarok/dlya-pary" element={<CoupleGiftLanding />} />
            <Route path="/podarok/na-godovshchinu" element={<AnniversaryGiftLanding />} />
            <Route path="/podarok/rebenku" element={<ChildGiftLanding />} />
            <Route path="/podarok/skazka-po-foto" element={<PhotoFairyTaleLanding />} />
            <Route path="/print" element={<Print />} />
            <Route path="/pay" element={<Print />} />
            <Route path="/romantic" element={<Romantic />} />
            <Route path="/indian" element={<Indian />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/tag/:tag" element={<BlogTag />} />
            <Route path="/blog/:slug" element={<BlogPost />} />
            <Route path="/blog-admin" element={<BlogAdmin />} />
            <Route path="/loveproportion" element={<LoveProportion />} />
            <Route path="/8march" element={<March8 />} />
            <Route path="/book-preview" element={<BookPreview />} />
            <Route path="/naruto-story" element={<NarutoStory />} />
            <Route path="/wizard" element={<Wizard />} />
            <Route path="/design-test" element={<DesignTest />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        <FairytellerChat />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
