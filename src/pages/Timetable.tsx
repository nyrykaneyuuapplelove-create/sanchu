import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { currentSlot, DAYS, fmtMin, PERIODS } from "../lib/time";
import { myCourseIds, useStore } from "../lib/store";
import { PageHeader } from "../components/Layout";
import { Button, Field, Modal, inputCls, useNow } from "../components/ui";

export default function Timetable() {
  const now = useNow();
  const courses = useStore((s) => s.courses);
  const enrollments = useStore((s) => s.enrollments);
  const me = useStore((s) => s.me);
  const importTimetable = useStore((s) => s.importTimetable);
  const [adding, setAdding] = useState<{ day: number; period: number } | null>(null);

  const mine = useMemo(() => new Set(myCourseIds({ enrollments, me })), [enrollments, me]);
  const cell = (day: number, period: number) => courses.find((c) => mine.has(c.id) && c.day === day && c.period === period);
  const slot = currentSlot(now);
  const hasSat = courses.some((c) => mine.has(c.id) && c.day === 5);
  const days = hasSat ? DAYS : DAYS.slice(0, 5);
  const maxPeriod = Math.max(5, ...courses.filter((c) => mine.has(c.id)).map((c) => c.period));

  return (
    <div>
      <PageHeader
        title="時間割"
        right={
          <Link to="/timetable/import" className="rounded-xl bg-teal-700 px-3 py-2 text-xs font-bold text-white">
            スクショで登録
          </Link>
        }
      />
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
        <div className="grid" style={{ gridTemplateColumns: `34px repeat(${days.length}, minmax(0, 1fr))` }}>
          <div className="bg-stone-100" />
          {days.map((d, i) => (
            <div key={d} className={`py-1.5 text-center text-xs font-bold ${slot?.day === i ? "bg-teal-700 text-white" : "bg-stone-100 text-stone-600"}`}>
              {d}
            </div>
          ))}
          {PERIODS.slice(0, maxPeriod).map((p, pi) => (
            <Row key={pi}>
              <div className="flex flex-col items-center justify-center border-t border-stone-100 bg-stone-50 py-1 text-[10px] leading-tight text-stone-500">
                <span className="text-sm font-black text-stone-700">{pi + 1}</span>
                <span>{fmtMin(p.start)}</span>
                <span>{fmtMin(p.end)}</span>
              </div>
              {days.map((_, di) => {
                const c = cell(di, pi + 1);
                const active = slot?.day === di && slot.period === pi + 1;
                return (
                  <div key={di} className="border-t border-l border-stone-100 p-0.5">
                    {c ? (
                      <Link
                        to={`/course/${c.id}`}
                        className={`flex h-full min-h-[72px] flex-col rounded-lg p-1 text-[10.5px] leading-tight ${active ? "bg-teal-700 text-white" : "bg-teal-50 text-teal-950"}`}
                      >
                        <span className="line-clamp-3 font-bold">{c.name}</span>
                        <span className={`mt-auto line-clamp-2 break-all ${active ? "text-teal-100" : "text-teal-700"}`}>{c.room}</span>
                      </Link>
                    ) : (
                      <button
                        className="h-full min-h-[72px] w-full rounded-lg text-stone-300 hover:bg-stone-50"
                        onClick={() => setAdding({ day: di, period: pi + 1 })}
                        aria-label={`${DAYS[di]}曜${pi + 1}限に授業を追加`}
                      >
                        +
                      </button>
                    )}
                  </div>
                );
              })}
            </Row>
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs text-stone-500">空いているコマをタップすると、授業を手で追加できます。</p>

      {adding && (
        <AddCourse
          slot={adding}
          onClose={() => setAdding(null)}
          onSave={(row) => {
            importTimetable([row]);
            setAdding(null);
          }}
        />
      )}
    </div>
  );
}

const Row = ({ children }: { children: React.ReactNode }) => <>{children}</>;

function AddCourse({
  slot,
  onClose,
  onSave,
}: {
  slot: { day: number; period: number };
  onClose: () => void;
  onSave: (r: { name: string; teacher: string; room: string; day: number; period: number }) => void;
}) {
  const courses = useStore((s) => s.courses);
  const [name, setName] = useState("");
  const [teacher, setTeacher] = useState("");
  const [room, setRoom] = useState("");
  // 同じコマにすでにある授業（他の学生が登録済み）を候補に出す
  const candidates = courses.filter((c) => c.day === slot.day && c.period === slot.period);
  return (
    <Modal open onClose={onClose} title={`${DAYS[slot.day]}曜 ${slot.period}限に追加`}>
      {candidates.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-sm font-semibold text-stone-700">このコマの授業</p>
          <div className="space-y-2">
            {candidates.map((c) => (
              <button key={c.id} className="w-full rounded-xl bg-teal-50 p-3 text-left" onClick={() => onSave({ ...c })}>
                <div className="font-bold">{c.name}</div>
                <div className="text-xs text-stone-500">
                  {c.teacher}　{c.room}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-3">
        <Field label="授業名">
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="担当教員">
          <input className={inputCls} value={teacher} onChange={(e) => setTeacher(e.target.value)} />
        </Field>
        <Field label="教室">
          <input className={inputCls} value={room} onChange={(e) => setRoom(e.target.value)} />
        </Field>
        <Button className="w-full" disabled={!name.trim()} onClick={() => onSave({ name, teacher, room, ...slot })}>
          追加する
        </Button>
      </div>
    </Modal>
  );
}
