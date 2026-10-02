import { Link } from "react-router-dom";
import { isHidden, useStore } from "../lib/store";
import type { Post } from "../lib/types";
import { relative } from "../lib/time";
import { HiddenNote, ModMenu } from "./Moderation";
import { Avatar, UserName } from "./ui";

/** 掲示板の書き込み1件（通報・ブロック・削除メニュー付き） */
export function PostItem({ p, now, courseName }: { p: Post; now: Date; courseName?: string }) {
  const me = useStore((s) => s.me);
  const deletePost = useStore((s) => s.deletePost);
  const hidden = useStore((s) => p.userId === s.me && isHidden(s, "post", p.id));
  return (
    <li className="flex gap-3">
      <Avatar userId={p.userId} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
          <UserName userId={p.userId} />
          {courseName && (
            <Link to={`/course/${p.courseId}`} className="text-xs font-bold text-teal-700">
              {courseName}
            </Link>
          )}
          <span className="text-[11px] text-stone-400">{relative(p.createdAt, now)}</span>
        </div>
        <p className="text-[15px] break-words whitespace-pre-wrap">{p.text}</p>
        {hidden && <HiddenNote />}
      </div>
      <ModMenu type="post" id={p.id} owner={p.userId} onDelete={p.userId === me ? () => deletePost(p.id) : undefined} />
    </li>
  );
}
