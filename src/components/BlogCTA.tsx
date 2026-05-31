import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Heart } from "lucide-react";

const BlogCTA = () => (
  <aside className="my-12 border border-black bg-[#f5f5f5] p-5 md:p-7">
    <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#5e6264]">
      <BookOpen className="h-4 w-4 text-black" />
      Персональная книга
    </p>
    <h3 className="mt-4 max-w-2xl text-[28px] font-black uppercase leading-[0.95] tracking-[-0.02em] text-[#E89C31] md:text-[42px]">
      Соберите историю, которая звучит как подарок лично человеку.
    </h3>
    <p className="mt-4 max-w-2xl text-[17px] leading-8 text-[#5e6264]">
      Добавьте героя, детали, жанр и фото. FairyTeller соберет PDF, а печатную книгу можно оформить после просмотра результата.
    </p>
    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
      <Link
        to="/create"
        className="inline-flex h-12 items-center justify-center gap-2 bg-black px-5 text-[13px] font-bold uppercase tracking-[0.08em] text-white transition hover:bg-[#5e6264]"
      >
        Создать книгу
        <ArrowRight className="h-4 w-4" />
      </Link>
      <Link
        to="/romantic"
        className="inline-flex h-12 items-center justify-center gap-2 border border-black bg-white px-5 text-[13px] font-bold uppercase tracking-[0.08em] text-black transition hover:bg-black hover:text-white"
      >
        <Heart className="h-4 w-4" />
        Для двоих
      </Link>
    </div>
  </aside>
);

export default BlogCTA;
