import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import About from './pages/About';
import PublicForums from './pages/PublicForums';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardOverview from './pages/dashboard/DashboardOverview';
import Meetings from './pages/dashboard/Meetings';
import MeetingDetails from './pages/dashboard/MeetingDetails';
import Forums from './pages/dashboard/Forums';
import ForumDetails from './pages/dashboard/ForumDetails';
import Users from './pages/dashboard/Users';
import VirtualMeeting from './pages/dashboard/VirtualMeeting';
import Profile from './pages/dashboard/Profile';
import Polls from './pages/dashboard/Polls';
import Announcements from './pages/dashboard/Announcements';
import Documents from './pages/dashboard/Documents';
import Projects from './pages/dashboard/Projects';
import Issues from './pages/dashboard/Issues';

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<MainLayout />}>
              <Route index element={<Home />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="about" element={<About />} />
              <Route path="forums" element={<PublicForums />} />
            </Route>

            {/* Dashboard Routes */}
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashboardOverview />} />
              <Route path="meetings" element={<Meetings />} />
              <Route path="meetings/:id" element={<MeetingDetails />} />
              <Route path="meetings/:id/live" element={<VirtualMeeting />} />
              <Route path="forums" element={<Forums />} />
              <Route path="forums/:id" element={<ForumDetails />} />
              <Route path="users" element={<Users />} />
              <Route path="profile" element={<Profile />} />
              <Route path="polls" element={<Polls />} />
              <Route path="announcements" element={<Announcements />} />
              <Route path="documents" element={<Documents />} />
              <Route path="projects" element={<Projects />} />
              <Route path="issues" element={<Issues />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
