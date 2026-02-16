import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const BlogCTA = () => (
  <div className="my-12 p-8 rounded-2xl bg-[#083248]/80 border border-[#E89C31]/20 text-center shadow-lg shadow-[#E89C31]/10">
    <h3 className="text-2xl font-bold text-[#E89C31] mb-3">Создайте свою персональную сказку</h3>
    <p className="text-[#DBA858]/80 mb-6 max-w-lg mx-auto">
      Уникальная история с иллюстрациями — за 15 минут. Идеальный подарок для любого повода.
    </p>
    <div className="flex flex-col sm:flex-row gap-4 justify-center">
      <Link to="/create">
        <Button className="bg-[#E89C31] text-[#031B28] hover:bg-[#DBA858] font-semibold px-8 py-6 text-lg rounded-xl">
          Создать сказку
        </Button>
      </Link>
      <Link to="/romantic">
        <Button variant="outline" className="border-[#E89C31]/30 text-[#E89C31] hover:bg-[#E89C31]/10 px-8 py-6 text-lg rounded-xl">
          Романтические сказки
        </Button>
      </Link>
    </div>
  </div>
);

export default BlogCTA;
