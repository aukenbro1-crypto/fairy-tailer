import { Link } from "react-router-dom";
import logoImage from "@/assets/logo.png";
import dragonHeaderImage from "@/assets/dragon-header.png";
import dragonHeaderHoverImage from "@/assets/dragon-header-hover.png";
import { useState, useRef, useEffect } from "react";
import { Home, BookOpen, Scroll, FileText } from "lucide-react";

const BlogHeader = () => {
  const [dragonHovered, setDragonHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 bg-[#031B28]/90 backdrop-blur-sm border-b border-[#E89C31]/20 shadow-lg shadow-[#E89C31]/10">
      <div className="container mx-auto px-4 py-5 flex justify-between items-center">
        <Link to="/">
          <img src={logoImage} alt="FairyTeller" className="h-16 object-contain" />
        </Link>

        <div className="flex items-center relative" ref={menuRef}>
          <div
            className="cursor-pointer"
            onMouseEnter={() => setDragonHovered(true)}
            onMouseLeave={() => setDragonHovered(false)}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <img
              src={dragonHovered ? dragonHeaderHoverImage : dragonHeaderImage}
              alt="Меню"
              className="h-16 object-contain transition-all duration-200"
            />
          </div>

          {menuOpen && (
            <div className="absolute top-full right-0 mt-2 w-64 bg-[#031B28] border border-[#E89C31]/30 rounded-lg shadow-xl shadow-[#E89C31]/20 z-50 animate-fade-in">
              <div className="py-2">
                <Link to="/" className="flex items-center gap-3 px-4 py-3 hover:bg-[#083248] transition-colors text-[#DBA858] hover:text-[#E89C31]" onClick={() => setMenuOpen(false)}>
                  <Home size={20} />
                  <span>Главная</span>
                </Link>
                <Link to="/blog" className="flex items-center gap-3 px-4 py-3 hover:bg-[#083248] transition-colors text-[#DBA858] hover:text-[#E89C31]" onClick={() => setMenuOpen(false)}>
                  <FileText size={20} />
                  <span>Блог</span>
                </Link>
                <div className="h-px bg-[#E89C31]/20 my-2 mx-4" />
                <Link to="/create" className="flex items-center gap-3 px-4 py-3 hover:bg-[#083248] transition-colors text-[#E89C31] font-semibold" onClick={() => setMenuOpen(false)}>
                  <Scroll size={20} />
                  <span>Создать сказку</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default BlogHeader;
