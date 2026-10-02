import { Link, Navigate, useParams } from "react-router-dom";
import { useStore, useUser } from "../lib/store";
import { DAYS } from "../lib/time";
import { PageHeader } from "../components/Layout";
import { ProfileCard } from "../components/ProfileCard";
import { useSendMoney } from "../components/SendMoney";
import { Button, Card, Empty } from "../components/ui";

export default function UserPage() {
  const { id } = useParams();
  const user = useUser(id);
  const me = useStore((s) => s.me);
  const enrollments = useStore((s) => s.enrollments);
  const courses = useStore((s) => s.courses);
  const sendMoney = useSendMoney();

  if (id === me) return <Navigate to="/me" replace />;
  if (!user) return <Empty>ユーザーが見つかりません</Empty>;

  const mine = new Set(enrollments[me!] ?? []);
  const common = courses.filter((c) => mine.has(c.id) && (enrollments[user.id] ?? []).includes(c.id));

  return (
    <div className="space-y-4">
      <PageHeader title={user.name} back />
      <div className="flex justify-center">
        <ProfileCard user={user} />
      </div>
      <Button className="w-full py-3" onClick={() => sendMoney({ to: user.id })}>
        {user.name}さんにぺいを送る
      </Button>
      <Card>
        <h2 className="mb-2 font-bold">一緒に受けている授業</h2>
        {common.length === 0 ? (
          <Empty>ありません</Empty>
        ) : (
          <ul className="space-y-1">
            {common.map((c) => (
              <li key={c.id}>
                <Link to={`/course/${c.id}`} className="block rounded-lg px-2 py-1.5 text-sm hover:bg-stone-50">
                  <span className="mr-2 text-xs text-stone-500">
                    {DAYS[c.day]}
                    {c.period}
                  </span>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
