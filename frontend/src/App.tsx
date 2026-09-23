import { NavLink, Navigate, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import { AppDataProvider } from "./context/AppData";
import { CompanyDataProvider } from "./context/CompanyData";
import { ReferenceDataProvider } from "./context/ReferenceData";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { useTheme } from "./hooks/useTheme";
import { useUnreadMessages } from "./hooks/useUnreadMessages";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Signup } from "./pages/Signup";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { Terms } from "./pages/Terms";
import { Privacy } from "./pages/Privacy";
import { Profile } from "./pages/Profile";
import { ResumeView } from "./pages/ResumeView";
import { Browse } from "./pages/Browse";
import { ListingDetail } from "./pages/ListingDetail";
import { Saved } from "./pages/Saved";
import { Applications } from "./pages/Applications";
import { Messages } from "./pages/Messages";
import { CompanyProfile } from "./pages/CompanyProfile";
import { PostListing } from "./pages/PostListing";
import { CompanyDashboard } from "./pages/CompanyDashboard";
import { CompanyApplicants } from "./pages/CompanyApplicants";
import { TalentBrowse } from "./pages/TalentBrowse";
import { CompanyAnalytics } from "./pages/CompanyAnalytics";
import { NotificationBell } from "./components/NotificationBell";
import { EarlyAccessGate } from "./components/EarlyAccessGate";
import { LogOutIcon, MoonIcon, SunIcon } from "./components/icons";

function PageLoading() {
  return (
    <div className="page">
      <p style={{ color: "var(--text-secondary)" }}>Loading…</p>
    </div>
  );
}

// Which nav/section shows is decided by who's actually logged in, not a
// free-standing toggle — a real account is either an applicant or a
// company account, never both at once.
function RequireApplicant() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "applicant") return <Navigate to="/company" replace />;
  return (
    <AppDataProvider>
      <Outlet />
    </AppDataProvider>
  );
}

function RequireCompany() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoading />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "company") return <Navigate to="/browse" replace />;
  return (
    <CompanyDataProvider>
      <Outlet />
    </CompanyDataProvider>
  );
}

// Messaging is the one section both roles share — it needs someone signed
// in, but doesn't care which side of the marketplace they're on.
function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoading />;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function TopBar() {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  // Which nav set to show is a property of who's logged in, not the URL —
  // matters once a route like /messages is reachable by both roles.
  const isCompany = user?.role === "company";
  const navigate = useNavigate();
  const unread = useUnreadMessages();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <NavLink to="/" className="wordmark">
          Intern<span>EZ</span>
        </NavLink>
        <nav className="nav">
          {isCompany ? (
            <>
              <NavLink to="/company" end className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                Profile
              </NavLink>
              <NavLink to="/company/listings" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                Listings
              </NavLink>
              <NavLink to="/company/applicants" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                Applicants
              </NavLink>
              <NavLink to="/company/talent" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                Talent
              </NavLink>
              <NavLink to="/company/analytics" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                Analytics
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/profile" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                Profile
              </NavLink>
              <NavLink to="/browse" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                Browse
              </NavLink>
              <NavLink to="/saved" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                Saved
              </NavLink>
              <NavLink to="/applications" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
                Applications
              </NavLink>
            </>
          )}
          <NavLink to="/messages" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}>
            Messages{unread > 0 && <span className="unread-dot" style={{ marginLeft: 6 }} />}
          </NavLink>
        </nav>
        <div className="topbar-controls">
          <span className="topbar-email" title={user?.email}>
            {user?.email}
          </span>
          <NotificationBell />
          <button type="button" className="icon-btn" onClick={toggle} aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"} title={theme === "light" ? "Dark mode" : "Light mode"}>
            {theme === "light" ? <MoonIcon /> : <SunIcon />}
          </button>
          <button type="button" className="icon-btn" onClick={handleLogout} aria-label="Log out" title="Log out">
            <LogOutIcon />
          </button>
        </div>
      </div>
    </header>
  );
}

function AppLayout() {
  return (
    <ReferenceDataProvider>
      <div className="app-shell">
        <TopBar />
        <Outlet />
      </div>
    </ReferenceDataProvider>
  );
}

export default function App() {
  return (
    <EarlyAccessGate>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />

          <Route element={<AppLayout />}>
            <Route element={<RequireApplicant />}>
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/resume" element={<ResumeView />} />
              <Route path="/browse" element={<Browse />} />
              <Route path="/listings/:id" element={<ListingDetail />} />
              <Route path="/saved" element={<Saved />} />
              <Route path="/applications" element={<Applications />} />
            </Route>

            <Route element={<RequireCompany />}>
              <Route path="/company" element={<CompanyProfile />} />
              <Route path="/company/listings" element={<CompanyDashboard />} />
              <Route path="/company/listings/new" element={<PostListing />} />
              <Route path="/company/listings/:id/edit" element={<PostListing />} />
              <Route path="/company/applicants" element={<CompanyApplicants />} />
              <Route path="/company/talent" element={<TalentBrowse />} />
              <Route path="/company/analytics" element={<CompanyAnalytics />} />
            </Route>

            <Route element={<RequireAuth />}>
              <Route path="/messages" element={<Messages />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </EarlyAccessGate>
  );
}
