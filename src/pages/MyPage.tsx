import { Link } from "react-router-dom";
import { useMe } from "../lib/store";
import { PageHeader } from "../components/Layout";
import { ProfileCard } from "../components/ProfileCard";
import { Card } from "../components/ui";

export default function MyPage() {
  const me = useMe()!;
  return (
    <div className="space-y-4">
      <PageHeader title="マイページ" />
      <Card className="flex items-center gap-4">
        <img src={me.avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
        <div className="min-w-0 flex-1">
          <div className="text-lg font-black">{me.name}</div>
          <div className="text-sm text-stone-500">学籍番号 {me.studentId}</div>
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <Link to="/me/edit" className="rounded-2xl bg-white p-4 text-center text-sm font-bold shadow-sm ring-1 ring-stone-200/70">
          ✏️ プロフィールを編集
        </Link>
        <Link to="/me/card" className="rounded-2xl bg-teal-700 p-4 text-center text-sm font-bold text-white shadow-sm">
          🪪 カードを PDF に
        </Link>
      </div>
      <div className="flex justify-center">
        <ProfileCard user={me} />
      </div>
      <Link to="/settings" className="block rounded-2xl bg-white p-4 text-sm font-bold text-stone-600 shadow-sm ring-1 ring-stone-200/70">
        ⚙️ 設定・デモ用の操作
      </Link>
    </div>
  );
}
