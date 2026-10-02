import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { SendMoneyProvider } from "./components/SendMoney";
import { useStore } from "./lib/store";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Timetable from "./pages/Timetable";
import TimetableImport from "./pages/TimetableImport";
import CoursePage from "./pages/Course";
import Assignments from "./pages/Assignments";
import AssignmentNew from "./pages/AssignmentNew";
import AssignmentDetail from "./pages/AssignmentDetail";
import Board from "./pages/Board";
import RequestNew from "./pages/RequestNew";
import RequestDetail from "./pages/RequestDetail";
import Wallet from "./pages/Wallet";
import MyPage from "./pages/MyPage";
import ProfileEdit from "./pages/ProfileEdit";
import ProfileCardPage from "./pages/ProfileCardPage";
import UserPage from "./pages/UserPage";
import Inbox from "./pages/Inbox";
import Settings from "./pages/Settings";

export default function App() {
  const me = useStore((s) => s.me);
  if (!me) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }
  return (
    <SendMoneyProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="timetable/import" element={<TimetableImport />} />
          <Route path="course/:id" element={<CoursePage />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="assignments/new" element={<AssignmentNew />} />
          <Route path="assignments/:id" element={<AssignmentDetail />} />
          <Route path="board" element={<Board />} />
          <Route path="board/new" element={<RequestNew />} />
          <Route path="board/:id" element={<RequestDetail />} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="me" element={<MyPage />} />
          <Route path="me/edit" element={<ProfileEdit />} />
          <Route path="me/card" element={<ProfileCardPage />} />
          <Route path="u/:id" element={<UserPage />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </SendMoneyProvider>
  );
}
