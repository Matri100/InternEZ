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
import { Moderation } from "./pages/Moderation";
import { NotificationBell } from "./components/NotificationBell";
import { EarlyAccessGate } from "./components/EarlyAccessGate";
import { AccessibilityMenu } from "./components/AccessibilityMenu";
import { LanguageMenu } from "./components/LanguageMenu";
import { SkipLink } from "./components/SkipLink";
import { LogOutIcon, MoonIcon, ShieldIcon, SunIcon } from "./components/icons";
import { useI18n } from "./i18n";

function PageLoading() {
  const { t } = useI18n();
  return (
    <div className="page">
      <p style={{ color: "var(--text-secondary)" }}>{t("common.loading")}</p>
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
  const { t } = useI18n();
  const navClass = ({ isActive }: { isActive: boolean }) => `nav-link ${isActive ? "active" : ""}`;

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
              <NavLink to="/company" end className={navClass}>
                {t("nav.profile")}
              </NavLink>
              <NavLink to="/company/listings" className={navClass}>
                {t("nav.listings")}
              </NavLink>
              <NavLink to="/company/applicants" className={navClass}>
                {t("nav.applicants")}
              </NavLink>
              <NavLink to="/company/talent" className={navClass}>
                {t("nav.talent")}
              </NavLink>
              <NavLink to="/company/analytics" className={navClass}>
                {t("nav.analytics")}
              </NavLink>
            </>
          ) : (
            <>
              <NavLink to="/profile" className={navClass}>
                {t("nav.profile")}
              </NavLink>
              <NavLink to="/browse" className={navClass}>
                {t("nav.browse")}
              </NavLink>
              <NavLink to="/saved" className={navClass}>
                {t("nav.saved")}
              </NavLink>
              <NavLink to="/applications" className={navClass}>
                {t("nav.applications")}
              </NavLink>
            </>
          )}
          <NavLink to="/messages" className={navClass}>
            {t("nav.messages")}
            {unread > 0 && <span className="unread-dot" style={{ marginLeft: 6 }} />}
          </NavLink>
        </nav>
        <div className="topbar-controls">
          <span className="topbar-email" title={user?.email}>
            {user?.email}
          </span>
          {user?.isAdmin && (
            <NavLink to="/admin" className="icon-btn" aria-label={t("nav.moderation")} title={t("nav.moderation")}>
              <ShieldIcon />
            </NavLink>
          )}
          <NotificationBell />
          <button
            type="button"
            className="icon-btn"
            onClick={toggle}
            aria-label={theme === "light" ? t("nav.switchToDark") : t("nav.switchToLight")}
            title={theme === "light" ? t("nav.darkMode") : t("nav.lightMode")}
          >
            {theme === "light" ? <MoonIcon /> : <SunIcon />}
          </button>
          <button type="button" className="icon-btn" onClick={handleLogout} aria-label={t("nav.logOut")} title={t("nav.logOut")}>
            <LogOutIcon />
          </button>
          <AccessibilityMenu />
          <LanguageMenu />
        </div>
      </div>
    </header>
  );
}

function AppLayout() {
  return (
    <ReferenceDataProvider>
      <div className="app-shell">
        <SkipLink />
        <TopBar />
        <main id="main-content" className="main-content" tabIndex={-1}>
          <Outlet />
        </main>
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
              <Route path="/admin" element={<Moderation />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </EarlyAccessGate>
  );
}
