(() => {
  // frontend/public/app.jsx
  var { useState, useEffect, useRef } = React;
  async function apiCall(endpoint, method = "GET", body = null) {
    const token = localStorage.getItem("codehub_token");
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const config = { method, headers };
    if (body) config.body = JSON.stringify(body);
    const apiBase = window.location.port === "8000" ? "/api" : `http://${window.location.hostname || "localhost"}:8000/api`;
    let res;
    try {
      res = await fetch(`${apiBase}${endpoint}`, config);
    } catch (netErr) {
      try {
        res = await fetch(`http://127.0.0.1:8000/api${endpoint}`, config);
      } catch (secondErr) {
        throw new Error("Connection failed: Unable to reach backend API on port 8000. Please ensure the Node.js/Express server is running (node server.js on port 8000).");
      }
    }
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("Server returned invalid JSON: " + text.slice(0, 100));
    }
    if (!res.ok) {
      throw new Error(data.error || `Server error (${res.status})`);
    }
    return data;
  }
  function UserAvatar({ user, size = 36 }) {
    if (user && user.avatar_url) {
      return /* @__PURE__ */ React.createElement(
        "img",
        {
          src: user.avatar_url,
          alt: user.full_name || user.username || user.email || "Avatar",
          style: {
            width: size,
            height: size,
            borderRadius: "50%",
            objectFit: "cover",
            border: "2px solid #58a6ff",
            boxShadow: "0 2px 8px rgba(88,166,255,0.25)",
            display: "inline-block",
            flexShrink: 0
          }
        }
      );
    }
    const initial = (user?.full_name || user?.username || user?.email || "U")[0].toUpperCase();
    return /* @__PURE__ */ React.createElement("div", { style: {
      width: size,
      height: size,
      borderRadius: "50%",
      background: "linear-gradient(135deg, #1f6feb, #388bfd)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 800,
      fontSize: Math.max(11, Math.floor(size * 0.42)),
      color: "#fff",
      border: "2px solid rgba(88,166,255,0.4)",
      boxShadow: "0 2px 8px rgba(31,111,235,0.3)",
      flexShrink: 0
    } }, initial);
  }
  function useTypewriter(text, speed = 55) {
    const [displayed, setDisplayed] = useState("");
    useEffect(() => {
      setDisplayed("");
      let i = 0;
      const timer = setInterval(() => {
        setDisplayed(text.slice(0, i + 1));
        i++;
        if (i >= text.length) clearInterval(timer);
      }, speed);
      return () => clearInterval(timer);
    }, [text, speed]);
    return displayed;
  }
  var getStoredUser = () => {
    try {
      const raw = localStorage.getItem("codehub_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };
  function App() {
    const [theme, setTheme] = useState(localStorage.getItem("codehub_theme") || "dark");
    const [user, setUser] = useState(getStoredUser);
    const [currentView, setCurrentView] = useState(user ? "dashboard" : "landing");
    const [selectedRepoId, setSelectedRepoId] = useState(null);
    const [notification, setNotification] = useState(null);
    useEffect(() => {
      if (user && (currentView === "landing" || currentView === "login" || currentView === "register")) {
        setCurrentView("dashboard");
      }
    }, [user, currentView]);
    const [chatMessages, setChatMessages] = useState([
      { sender: "ai", text: "\u{1F44B} Hello! I am your **CodeHub Gemini AI Copilot**. Ask me for code reviews, PR summaries, security audits, or architectural advice." }
    ]);
    const [aiInput, setAiInput] = useState("");
    const [isAiLoading, setIsAiLoading] = useState(false);
    const chatEndRef = useRef(null);
    const [repositories, setRepositories] = useState([]);
    const [isCreateRepoOpen, setIsCreateRepoOpen] = useState(false);
    const [newRepoName, setNewRepoName] = useState("");
    const [newRepoDesc, setNewRepoDesc] = useState("");
    const [newRepoVisibility, setNewRepoVisibility] = useState("public");
    const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
    const [deleteReason, setDeleteReason] = useState("");
    useEffect(() => {
      document.documentElement.setAttribute("data-theme", theme);
      if (theme === "dark") {
        document.documentElement.style.setProperty("--text-color", "#c9d1d9");
        document.documentElement.style.setProperty("--button-bg", "#1f6feb");
        document.documentElement.style.setProperty("--button-color", "#ffffff");
        document.documentElement.style.setProperty("--button-border", "#1f6feb");
      } else {
        document.documentElement.style.setProperty("--text-color", "#1f2328");
        document.documentElement.style.setProperty("--button-bg", "#e6edf3");
        document.documentElement.style.setProperty("--button-color", "#0d1117");
        document.documentElement.style.setProperty("--button-border", "#d0d7de");
      }
      localStorage.setItem("codehub_theme", theme);
    }, [theme]);
    useEffect(() => {
      if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);
    const showNotify = (msg, type = "success") => {
      setNotification({ msg, type });
      setTimeout(() => setNotification(null), 4500);
    };
    const handleLogout = () => {
      localStorage.removeItem("codehub_token");
      localStorage.removeItem("codehub_user");
      setUser(null);
      setCurrentView("landing");
      showNotify("Signed out successfully.", "info");
    };
    const onLoginSuccess = (userData) => {
      setUser(userData);
      setCurrentView("dashboard");
      showNotify(`Welcome back, ${userData.full_name || userData.email}! \u{1F389}`);
      if (userData.role !== "admin") {
        fetchRepositories();
      }
    };
    const fetchRepositories = async () => {
      try {
        const data = await apiCall("/repositories");
        setRepositories(data.repositories || []);
      } catch (err) {
        console.error(err);
      }
    };
    useEffect(() => {
      if (user && user.role !== "admin") {
        fetchRepositories();
      }
    }, [user]);
    const handleCreateRepo = async (e) => {
      e.preventDefault();
      if (user && (user.role === "admin" || user.role_type === "admin")) {
        showNotify("Admins are not permitted to create repositories. Repository creation is reserved for developer accounts.", "error");
        setIsCreateRepoOpen(false);
        return;
      }
      try {
        const res = await apiCall("/repositories", "POST", {
          name: newRepoName,
          description: newRepoDesc,
          visibility: newRepoVisibility
        });
        showNotify(`Repository '${res.name}' created!`);
        setIsCreateRepoOpen(false);
        setNewRepoName("");
        setNewRepoDesc("");
        fetchRepositories();
      } catch (err) {
        showNotify(err.message, "error");
      }
    };
    const handleVerifyEmail = async () => {
      try {
        await apiCall("/auth/verify-email", "POST", { user_id: user.id });
        const updated = { ...user, is_verified: true };
        setUser(updated);
        localStorage.setItem("codehub_user", JSON.stringify(updated));
        showNotify("Email verified! Workspace unlocked. \u2705");
      } catch (err) {
        showNotify(err.message, "error");
      }
    };
    const handleSelfDeleteSubmit = async (e) => {
      e.preventDefault();
      try {
        const res = await apiCall("/auth/request-deletion", "POST", { reason: deleteReason });
        showNotify(res.message, "info");
        setIsDeleteAccountOpen(false);
        const updated = { ...user, account_status: "deletion_pending" };
        setUser(updated);
        localStorage.setItem("codehub_user", JSON.stringify(updated));
      } catch (err) {
        showNotify(err.message, "error");
      }
    };
    const handleAiSend = async (e) => {
      e.preventDefault();
      if (!aiInput.trim()) return;
      const userMsg = aiInput;
      setChatMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
      setAiInput("");
      setIsAiLoading(true);
      try {
        const res = await apiCall("/gemini/chat", "POST", { prompt: userMsg, repo_id: selectedRepoId });
        setChatMessages((prev) => [...prev, { sender: "ai", text: res.response, model: res.model }]);
      } catch (err) {
        setChatMessages((prev) => [...prev, { sender: "ai", text: "\u26A0\uFE0F Error: " + err.message }]);
      } finally {
        setIsAiLoading(false);
      }
    };
    const navTo = (view) => setCurrentView(view);
    const isAuthOrLanding = currentView === "landing" || currentView === "login" || currentView === "register";
    return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen flex flex-col", style: { margin: 0, padding: 0, width: "100%", minHeight: "100vh", background: theme === "dark" ? "#0d1117" : "#f6f8fa", color: theme === "dark" ? "#e6edf3" : "#1f2328", boxSizing: "border-box" } }, !isAuthOrLanding && /* @__PURE__ */ React.createElement("header", { style: {
      background: theme === "dark" ? "#161b22" : "#ffffff",
      borderBottom: theme === "dark" ? "1px solid #30363d" : "1px solid #d0d7de",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      padding: "12px clamp(16px, 3vw, 28px)",
      position: "sticky",
      top: 0,
      zIndex: 40,
      width: "100%",
      margin: 0,
      boxSizing: "border-box",
      boxShadow: theme === "dark" ? "none" : "0 1px 3px rgba(31, 35, 40, 0.06)"
    } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, cursor: "pointer", minWidth: 0 }, onClick: () => navTo(user ? "dashboard" : "landing") }, /* @__PURE__ */ React.createElement("img", { src: "logo.png", alt: "CodeHub", style: { width: 36, height: 36, borderRadius: 12, objectFit: "contain", display: "block", flexShrink: 0 } }), /* @__PURE__ */ React.createElement("span", { style: { lineHeight: 1, display: "inline-flex", alignItems: "center", fontSize: 18, fontWeight: 900, background: "linear-gradient(135deg,#58a6ff,#79c0ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" } }, "CodeHub")), user && /* @__PURE__ */ React.createElement("nav", { style: { display: "flex", alignItems: "center", gap: 8, marginLeft: "auto", marginRight: 12 } }, [
      { label: "\u2728 AI", view: "ai" },
      { label: "\u{1F4CA} Dashboard", view: "dashboard" },
      { label: "\u{1F4F0} Feed", view: "feed" },
      { label: "\u{1F4BC} Jobs", view: "jobs" },
      { label: "\u{1F4C1} Repos", view: "repos" },
      { label: "\u2699\uFE0F Settings", view: "settings" },
      ...user.role === "admin" ? [{ label: "\u{1F6E1}\uFE0F Admin", view: "admin_cockpit" }] : []
    ].map((n) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: n.view,
        onClick: () => navTo(n.view),
        style: {
          padding: "7px 16px",
          borderRadius: 20,
          fontWeight: 700,
          fontSize: 13,
          background: currentView === n.view ? theme === "dark" ? "#21262d" : "#e0f2fe" : "transparent",
          color: currentView === n.view ? theme === "dark" ? "#58a6ff" : "#0969da" : theme === "dark" ? "#8b949e" : "#57606a",
          border: currentView === n.view ? theme === "dark" ? "1px solid rgba(88,166,255,0.3)" : "1px solid #bae6fd" : "1px solid transparent",
          cursor: "pointer",
          transition: "all 0.2s"
        }
      },
      n.label
    ))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginLeft: user ? 0 : "auto" } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setTheme((t) => t === "dark" ? "light" : "dark"),
        title: "Toggle Light/Dark Theme",
        style: { padding: "7px 12px", borderRadius: 14, border: theme === "dark" ? "1px solid #30363d" : "1px solid #d0d7de", fontSize: 13, cursor: "pointer", background: theme === "dark" ? "transparent" : "#ffffff", color: theme === "dark" ? "#e6edf3" : "#1f2328" }
      },
      theme === "dark" ? "\u2600\uFE0F" : "\u{1F319}"
    ), user ? /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("div", { onClick: () => navTo("settings"), style: { display: "flex", alignItems: "center", gap: 8, padding: "5px 12px", borderRadius: 14, border: theme === "dark" ? "1px solid #30363d" : "1px solid #d0d7de", fontSize: 12, background: theme === "dark" ? "#161b22" : "#ffffff", cursor: "pointer", color: theme === "dark" ? "#e6edf3" : "#1f2328" } }, /* @__PURE__ */ React.createElement(UserAvatar, { user, size: 26 }), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 700 } }, user.username || user.email.split("@")[0]), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, padding: "2px 8px", borderRadius: 10, background: user.role === "admin" ? theme === "dark" ? "#3d1f6e" : "#f3e8ff" : theme === "dark" ? "#0d3b5e" : "#e0f2fe", color: user.role === "admin" ? theme === "dark" ? "#d2a8ff" : "#7c3aed" : theme === "dark" ? "#79c0ff" : "#0284c7", fontWeight: 800, textTransform: "uppercase" } }, user.role)), /* @__PURE__ */ React.createElement("button", { onClick: handleLogout, style: { padding: "6px 14px", borderRadius: 14, fontSize: 12, fontWeight: 700, color: "#f85149", background: theme === "dark" ? "rgba(248,81,73,0.1)" : "#fee2e2", border: "1px solid rgba(248,81,73,0.3)", cursor: "pointer" } }, "Sign Out")) : /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => navTo("login"), style: { padding: "7px 16px", borderRadius: 14, fontSize: 13, fontWeight: 700, color: "#58a6ff", background: "transparent", border: theme === "dark" ? "1px solid #30363d" : "1px solid #d0d7de", cursor: "pointer" } }, "Sign In"), /* @__PURE__ */ React.createElement("button", { onClick: () => navTo("register"), style: { padding: "7px 16px", borderRadius: 14, fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg, #238636, #2ea043)", color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 2px 10px rgba(35,134,54,0.3)" } }, "Register")))), notification && /* @__PURE__ */ React.createElement("div", { style: {
      position: "fixed",
      bottom: 24,
      right: 24,
      zIndex: 9999,
      padding: "12px 18px",
      borderRadius: 14,
      fontSize: 13,
      fontWeight: 700,
      background: notification.type === "error" ? "#3d0b0b" : notification.type === "info" ? "#0d1f47" : "#0a2d1a",
      border: `1px solid ${notification.type === "error" ? "#f85149" : notification.type === "info" ? "#58a6ff" : "#3fb950"}`,
      color: notification.type === "error" ? "#ffa198" : notification.type === "info" ? "#a5d6ff" : "#7ee787",
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
      animation: "slideUp 0.3s ease"
    } }, notification.msg), user && !user.is_verified && !isAuthOrLanding && /* @__PURE__ */ React.createElement("div", { style: { background: "#2d1f00", borderBottom: "1px solid #633c00", padding: "10px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "#e3b341" } }, /* @__PURE__ */ React.createElement("span", null, "\u26A0\uFE0F ", /* @__PURE__ */ React.createElement("strong", null, "Verify your email"), " to unlock repository creation and community interactions."), /* @__PURE__ */ React.createElement("button", { onClick: handleVerifyEmail, style: { padding: "6px 16px", background: "#9e6a03", color: "#fff", borderRadius: 12, fontWeight: 700, fontSize: 12, border: "none", cursor: "pointer" } }, "Verify Now")), user && user.account_status === "deletion_pending" && /* @__PURE__ */ React.createElement("div", { style: { background: "#2d0b0b", borderBottom: "1px solid #633c3c", padding: "10px 24px", fontSize: 13, color: "#f85149" } }, "\u{1F6A8} ", /* @__PURE__ */ React.createElement("strong", null, "Account Deletion Pending:"), " Your request is under admin review."), /* @__PURE__ */ React.createElement("main", { style: {
      flex: 1,
      width: "100%",
      display: "flex",
      flexDirection: "column",
      alignItems: "stretch",
      padding: isAuthOrLanding ? 0 : "24px clamp(12px, 3vw, 28px)",
      margin: 0,
      boxSizing: "border-box"
    } }, currentView === "landing" && /* @__PURE__ */ React.createElement(LandingView, { onLogin: () => navTo("login"), onRegister: () => navTo("register") }), currentView === "login" && /* @__PURE__ */ React.createElement(LoginView, { onSuccess: onLoginSuccess, onSwitchRegister: () => navTo("register"), onBack: () => navTo("landing") }), currentView === "register" && /* @__PURE__ */ React.createElement(RegisterView, { onSuccess: onLoginSuccess, onSwitchLogin: () => navTo("login"), onBack: () => navTo("landing") }), currentView === "ai" && /* @__PURE__ */ React.createElement(
      AIChatView,
      {
        chatMessages,
        aiInput,
        setAiInput,
        isAiLoading,
        onSend: handleAiSend,
        chatEndRef,
        user,
        onExploreNext: () => navTo(user?.role === "admin" ? "feed" : "repos"),
        theme
      }
    ), currentView === "feed" && /* @__PURE__ */ React.createElement(FeedView, { user, showNotify, theme }), currentView === "jobs" && /* @__PURE__ */ React.createElement(JobsView, { user, showNotify, theme }), currentView === "dashboard" && /* @__PURE__ */ React.createElement(DashboardView, { user, repositories, onSelectRepo: (id) => {
      setSelectedRepoId(id);
      navTo("repo_detail");
    }, onOpenCreateRepo: () => setIsCreateRepoOpen(true), onOpenDeleteAccount: () => setIsDeleteAccountOpen(true), onOpenAdmin: () => navTo("admin_cockpit"), onNavFeed: () => navTo("feed"), theme }), currentView === "repos" && /* @__PURE__ */ React.createElement(ReposView, { user, repositories, onSelectRepo: (id) => {
      setSelectedRepoId(id);
      navTo("repo_detail");
    }, onOpenCreateRepo: () => setIsCreateRepoOpen(true), showNotify, theme }), currentView === "repo_detail" && /* @__PURE__ */ React.createElement(RepoDetailView, { repoId: selectedRepoId, user, onBack: () => {
      navTo(user?.role === "admin" ? "dashboard" : "repos");
      fetchRepositories();
    }, showNotify, theme }), currentView === "settings" && /* @__PURE__ */ React.createElement(SettingsView, { user, repositories, onSelectRepo: (id) => {
      setSelectedRepoId(id);
      navTo("repo_detail");
    }, onOpenCreateRepo: () => setIsCreateRepoOpen(true), showNotify, onOpenDeleteAccount: () => setIsDeleteAccountOpen(true), onUserUpdated: (u) => setUser(u), theme }), currentView === "admin_cockpit" && /* @__PURE__ */ React.createElement(AdminCockpitView, { user, onBack: () => navTo("dashboard"), showNotify, theme })), isCreateRepoOpen && /* @__PURE__ */ React.createElement(Modal, { onClose: () => setIsCreateRepoOpen(false), title: "Create New Repository" }, user && (user.role === "admin" || user.role_type === "admin") ? /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } }, /* @__PURE__ */ React.createElement("div", { style: {
      padding: 18,
      borderRadius: 12,
      background: theme === "light" ? "#fee2e2" : "rgba(248,81,73,0.1)",
      border: theme === "light" ? "1px solid #fecaca" : "1px solid rgba(248,81,73,0.3)",
      color: theme === "light" ? "#991b1b" : "#ffa198",
      fontSize: 13,
      lineHeight: 1.6
    } }, /* @__PURE__ */ React.createElement("strong", { style: { color: theme === "light" ? "#b91c1c" : "#f85149", fontSize: 14, display: "block", marginBottom: 6 } }, "\u26D4 Action Reserved for Developer Accounts"), "Administrators are not permitted to create repositories. In CodeHub, repository creation and code commits are reserved exclusively for developer user accounts.", /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8, color: theme === "light" ? "#1f2328" : "#e6edf3" } }, "Administrator accounts handle ", /* @__PURE__ */ React.createElement("strong", null, "talent recruitment, job management, user moderation, and platform security"), ".")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end" } }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setIsCreateRepoOpen(false), style: { padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: theme === "light" ? "#f6f8fa" : "#21262d", color: theme === "light" ? "#1f2328" : "#e6edf3", border: theme === "light" ? "1px solid #d0d7de" : "1px solid #30363d", cursor: "pointer" } }, "Close"))) : /* @__PURE__ */ React.createElement("form", { onSubmit: handleCreateRepo, style: { display: "flex", flexDirection: "column", gap: 16 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11, fontWeight: 800, color: theme === "light" ? "#57606a" : "#8b949e", textTransform: "uppercase", letterSpacing: 1 } }, "Repository Name"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        required: true,
        placeholder: "e.g. quantum-compiler",
        value: newRepoName,
        onChange: (e) => setNewRepoName(e.target.value),
        style: { width: "100%", marginTop: 6, padding: "9px 14px", borderRadius: 8, border: theme === "light" ? "1px solid #d0d7de" : "1px solid #30363d", background: theme === "light" ? "#ffffff" : "#0d1117", color: theme === "light" ? "#1f2328" : "#e6edf3", fontSize: 13 }
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11, fontWeight: 800, color: theme === "light" ? "#57606a" : "#8b949e", textTransform: "uppercase", letterSpacing: 1 } }, "Description"), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        placeholder: "Brief description...",
        rows: "3",
        value: newRepoDesc,
        onChange: (e) => setNewRepoDesc(e.target.value),
        style: { width: "100%", marginTop: 6, padding: "9px 14px", borderRadius: 8, border: theme === "light" ? "1px solid #d0d7de" : "1px solid #30363d", background: theme === "light" ? "#ffffff" : "#0d1117", color: theme === "light" ? "#1f2328" : "#e6edf3", fontSize: 13 }
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11, fontWeight: 800, color: theme === "light" ? "#57606a" : "#8b949e", textTransform: "uppercase", letterSpacing: 1 } }, "Visibility"), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: newRepoVisibility,
        onChange: (e) => setNewRepoVisibility(e.target.value),
        style: { width: "100%", marginTop: 6, padding: "9px 14px", borderRadius: 8, border: theme === "light" ? "1px solid #d0d7de" : "1px solid #30363d", background: theme === "light" ? "#ffffff" : "#0d1117", color: theme === "light" ? "#1f2328" : "#e6edf3", fontSize: 13 }
      },
      /* @__PURE__ */ React.createElement("option", { value: "public" }, "\u{1F310} Public \u2013 Anyone can view"),
      /* @__PURE__ */ React.createElement("option", { value: "private" }, "\u{1F512} Private \u2013 Only you and admins")
    )), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: theme === "light" ? "#57606a" : "#8b949e", padding: "12px 14px", borderRadius: 10, background: theme === "light" ? "#f6f8fa" : "#161b22", border: theme === "light" ? "1px solid #d0d7de" : "1px solid #30363d" } }, "\u2601\uFE0F Creates a linked ", /* @__PURE__ */ React.createElement("strong", null, "Google Drive folder"), " + default ", /* @__PURE__ */ React.createElement("code", null, "main"), " branch with README.md."), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10 } }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setIsCreateRepoOpen(false), style: { padding: "8px 16px", borderRadius: 8, fontSize: 13, background: theme === "light" ? "#ffffff" : "#21262d", color: theme === "light" ? "#57606a" : "#8b949e", border: theme === "light" ? "1px solid #d0d7de" : "1px solid #30363d", cursor: "pointer" } }, "Cancel"), /* @__PURE__ */ React.createElement("button", { type: "submit", style: { padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: "linear-gradient(135deg, #238636, #2ea043)", color: "#fff", border: "none", cursor: "pointer", boxShadow: "0 2px 8px rgba(35,134,54,0.3)" } }, "Create Repository")))), isDeleteAccountOpen && /* @__PURE__ */ React.createElement(Modal, { onClose: () => setIsDeleteAccountOpen(false), title: "Request Account Deletion", danger: true }, /* @__PURE__ */ React.createElement("p", { style: { fontSize: 13, color: theme === "light" ? "#57606a" : "#8b949e", marginBottom: 16 } }, "This submits a deletion request to administrators who will review and permanently purge your account, repositories, and all Google Drive data."), /* @__PURE__ */ React.createElement("form", { onSubmit: handleSelfDeleteSubmit, style: { display: "flex", flexDirection: "column", gap: 12 } }, /* @__PURE__ */ React.createElement(
      "textarea",
      {
        required: true,
        rows: "3",
        placeholder: "Reason for deletion...",
        value: deleteReason,
        onChange: (e) => setDeleteReason(e.target.value),
        style: { padding: "10px 14px", borderRadius: 8, border: theme === "light" ? "1px solid #fca5a5" : "1px solid #f85149", background: theme === "light" ? "#ffffff" : "#0d1117", color: theme === "light" ? "#1f2328" : "#e6edf3", fontSize: 13 }
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10 } }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => setIsDeleteAccountOpen(false), style: { padding: "8px 16px", borderRadius: 8, fontSize: 13, background: theme === "light" ? "#ffffff" : "#21262d", color: theme === "light" ? "#57606a" : "#8b949e", border: theme === "light" ? "1px solid #d0d7de" : "1px solid #30363d", cursor: "pointer" } }, "Cancel"), /* @__PURE__ */ React.createElement("button", { type: "submit", style: { padding: "8px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700, background: "#da3633", color: "#fff", border: "none", cursor: "pointer" } }, "Submit Deletion Request")))), /* @__PURE__ */ React.createElement("style", null, `
                @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
                @keyframes fadeInUp { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
                @keyframes shimmer { 0%,100%{opacity:1} 50%{opacity:0.5} }
                @keyframes pulse-glow { 0%,100%{box-shadow:0 0 0 0 rgba(88,166,255,0.4)} 50%{box-shadow:0 0 0 10px rgba(88,166,255,0)} }

                /* \u2500\u2500 Bubble animation for auth pages \u2500\u2500 */
                @keyframes bubbleFloat {
                    0%   { transform: translateY(100vh) scale(0.6); opacity: 0; }
                    10%  { opacity: 0.6; }
                    90%  { opacity: 0.3; }
                    100% { transform: translateY(-120px) scale(1.1); opacity: 0; }
                }
                .bubble {
                    position: absolute;
                    border-radius: 50%;
                    animation: bubbleFloat linear infinite;
                    pointer-events: none;
                }

                .fade-in-up { animation: fadeInUp 0.6s ease both; }
                .fade-in-up-d1 { animation-delay:0.1s; }
                .fade-in-up-d2 { animation-delay:0.25s; }
                .fade-in-up-d3 { animation-delay:0.4s; }
                .fade-in-up-d4 { animation-delay:0.55s; }
                main > * { width: 100%; }
                .page-shell { width: 100%; max-width: 1280px; margin: 0 auto; }

                /* \u2500\u2500 Theme font colors & button styling \u2500\u2500 */
                :root {
                    --text-primary: #e6edf3;
                    --text-secondary: #8b949e;
                    --text-accent: #58a6ff;
                    --bg-base: #0d1117;
                    --bg-surface: #161b22;
                    --border-color: #30363d;
                }
                [data-theme="light"] {
                    --text-primary: #1f2328;
                    --text-secondary: #57606a;
                    --text-accent: #0969da;
                    --bg-base: #f6f8fa;
                    --bg-surface: #ffffff;
                    --border-color: #d0d7de;
                }
                button {
                    border-radius: 12px;
                    transition: all 0.2s ease;
                    font-family: inherit;
                }
                button:active {
                    transform: scale(0.98);
                }
                input, textarea, select {
                    border-radius: 12px;
                    font-family: inherit;
                }
            `));
  }
  function Modal({ children, onClose, title, danger }) {
    return /* @__PURE__ */ React.createElement("div", { onClick: onClose, style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50 } }, /* @__PURE__ */ React.createElement("div", { onClick: (e) => e.stopPropagation(), style: { background: "var(--bg-surface, #ffffff)", border: `1px solid ${danger ? "#f85149" : "var(--border-color, #d0d7de)"}`, borderRadius: 16, maxWidth: 500, width: "100%", padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.25)" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 } }, /* @__PURE__ */ React.createElement("h3", { style: { fontWeight: 800, fontSize: 16, color: danger ? "#f85149" : "var(--text-main, #1f2328)", margin: 0 } }, title), /* @__PURE__ */ React.createElement("button", { onClick: onClose, style: { color: "var(--text-muted, #57606a)", fontSize: 18, lineHeight: 1, background: "none", border: "none", cursor: "pointer" } }, "\u2715")), children));
  }
  function LandingView({ onLogin, onRegister }) {
    const tagline = useTypewriter("Build. Collaborate. Ship. \u{1F680}", 60);
    return /* @__PURE__ */ React.createElement("div", { style: { minHeight: "85vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "40px 16px" } }, /* @__PURE__ */ React.createElement("div", { className: "fade-in-up", style: { marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "center" } }, /* @__PURE__ */ React.createElement("img", { src: "logo.png", alt: "CodeHub", style: { width: 88, height: 88, borderRadius: 22, objectFit: "contain", display: "block", boxShadow: "0 0 40px rgba(88,166,255,0.4)", animation: "pulse-glow 3s infinite" } })), /* @__PURE__ */ React.createElement("h1", { className: "fade-in-up fade-in-up-d1", style: { fontSize: "clamp(2rem,6vw,4rem)", fontWeight: 900, lineHeight: 1.1, marginBottom: 16, background: "linear-gradient(135deg,#58a6ff 0%,#79c0ff 40%,#d2a8ff 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" } }, "Where Great Code", /* @__PURE__ */ React.createElement("br", null), "Comes to Life"), /* @__PURE__ */ React.createElement("p", { className: "fade-in-up fade-in-up-d2", style: { fontSize: 20, color: "#58a6ff", fontWeight: 700, minHeight: 28, marginBottom: 12 } }, tagline), /* @__PURE__ */ React.createElement("p", { className: "fade-in-up fade-in-up-d3", style: { fontSize: 15, color: "#8b949e", maxWidth: 580, marginBottom: 40, lineHeight: 1.6 } }, "CodeHub is your AI\u2011powered developer platform \u2014 host repositories, share progress in the community feed, merge pull requests, and get real\u2011time Gemini AI assistance."), /* @__PURE__ */ React.createElement("div", { className: "fade-in-up fade-in-up-d4", style: { display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", marginBottom: 60 } }, /* @__PURE__ */ React.createElement("button", { onClick: onRegister, style: { padding: "13px 32px", borderRadius: 10, fontWeight: 800, fontSize: 15, background: "linear-gradient(135deg,#238636,#2ea043)", color: "#fff", boxShadow: "0 4px 24px rgba(35,134,54,0.4)", border: "none", cursor: "pointer" } }, "Get Started \u2014 It's Free"), /* @__PURE__ */ React.createElement("button", { onClick: onLogin, style: { padding: "13px 32px", borderRadius: 10, fontWeight: 800, fontSize: 15, background: "transparent", color: "#58a6ff", border: "2px solid #58a6ff", cursor: "pointer" } }, "Sign In")), /* @__PURE__ */ React.createElement("div", { className: "fade-in-up fade-in-up-d4", style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 16, maxWidth: 860, width: "100%" } }, [
      { icon: "\u{1F916}", title: "Gemini AI Copilot", desc: "AI code reviews, PR summaries & security audits built-in." },
      { icon: "\u{1F4F0}", title: "Community Feed", desc: "Share code snippets, UI screenshots & project updates." },
      { icon: "\u{1F4BC}", title: "Tech Job Board", desc: "Find high-impact engineering roles filtered by stack & skills." },
      { icon: "\u{1F4C1}", title: "Repositories", desc: "Version control with Google Drive cloud storage." },
      { icon: "\u{1F500}", title: "Pull Requests", desc: "Propose, review and merge changes seamlessly." },
      { icon: "\u{1F6E1}\uFE0F", title: "Admin Cockpit", desc: "Role-based access, audit logs and user management." }
    ].map((f, i) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: i,
        style: { background: "#161b22", border: "1px solid #21262d", borderRadius: 12, padding: "20px 16px", textAlign: "left", transition: "border-color 0.2s, transform 0.2s" },
        onMouseEnter: (e) => {
          e.currentTarget.style.borderColor = "#58a6ff";
          e.currentTarget.style.transform = "translateY(-4px)";
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.borderColor = "#21262d";
          e.currentTarget.style.transform = "translateY(0)";
        }
      },
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: 28, marginBottom: 10 } }, f.icon),
      /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: 14, marginBottom: 6 } }, f.title),
      /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#8b949e", lineHeight: 1.5 } }, f.desc)
    ))));
  }
  function AIChatView({ chatMessages, aiInput, setAiInput, isAiLoading, onSend, chatEndRef, user, onExploreNext, theme }) {
    const isDark = theme !== "light";
    const cardBg = isDark ? "#161b22" : "#ffffff";
    const cardBorder = isDark ? "#30363d" : "#d0d7de";
    const textMain = isDark ? "#e6edf3" : "#1f2328";
    const textMuted = isDark ? "#8b949e" : "#57606a";
    const inputBg = isDark ? "#0d1117" : "#ffffff";
    return /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 840, margin: "0 auto", display: "flex", flexDirection: "column", height: "calc(100vh - 160px)", boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.3)" : "0 2px 10px rgba(0,0,0,0.06)", borderRadius: 16, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: {
      background: isDark ? "linear-gradient(135deg,#0d1f47,#1a1060)" : "linear-gradient(135deg,#e0f2fe,#f0fdf4)",
      border: "1px solid " + cardBorder,
      borderBottom: "none",
      padding: "20px 24px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 10
    } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { style: { fontWeight: 800, fontSize: 18, color: textMain, margin: 0 } }, "\u2728 Gemini AI Copilot"), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, color: textMuted, margin: "4px 0 0" } }, "Your intelligent code review, analysis & advisory assistant")), /* @__PURE__ */ React.createElement("button", { onClick: onExploreNext, style: { padding: "8px 18px", borderRadius: 10, fontWeight: 700, fontSize: 13, background: isDark ? "#21262d" : "#ffffff", color: isDark ? "#58a6ff" : "#0969da", border: "1px solid " + cardBorder, cursor: "pointer" } }, user?.role === "admin" ? "\u{1F4F0} Explore Community Feed \u2192" : "\u{1F4C1} Explore Repositories \u2192")), /* @__PURE__ */ React.createElement("div", { style: { flex: 1, overflowY: "auto", padding: "20px 24px", background: isDark ? "#0d1117" : "#f8fafc", borderLeft: "1px solid " + cardBorder, borderRight: "1px solid " + cardBorder, display: "flex", flexDirection: "column", gap: 12 } }, chatMessages.map((m, idx) => /* @__PURE__ */ React.createElement("div", { key: idx, style: { display: "flex", justifyContent: m.sender === "user" ? "flex-end" : "flex-start" } }, /* @__PURE__ */ React.createElement("div", { style: {
      maxWidth: "82%",
      padding: "10px 16px",
      borderRadius: m.sender === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
      background: m.sender === "user" ? "linear-gradient(135deg,#1f6feb,#388bfd)" : isDark ? "#161b22" : "#ffffff",
      border: m.sender === "user" ? "none" : "1px solid " + cardBorder,
      color: m.sender === "user" ? "#ffffff" : textMain,
      fontSize: 13,
      lineHeight: 1.6,
      whiteSpace: "pre-wrap",
      boxShadow: isDark ? "none" : "0 1px 3px rgba(31,35,40,0.06)"
    } }, m.text, m.model && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: isDark ? "#58a6ff" : "#0969da", marginTop: 6, fontWeight: 700 } }, m.model)))), isAiLoading && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, color: textMuted, fontSize: 13 } }, /* @__PURE__ */ React.createElement("span", { style: { animation: "shimmer 1.2s infinite" } }, "\u2728"), " Gemini is thinking..."), /* @__PURE__ */ React.createElement("div", { ref: chatEndRef })), /* @__PURE__ */ React.createElement("form", { onSubmit: onSend, style: { display: "flex", gap: 10, padding: "14px 18px", background: cardBg, border: "1px solid " + cardBorder } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        placeholder: "Ask about code, architecture, security, PR summaries...",
        value: aiInput,
        onChange: (e) => setAiInput(e.target.value),
        style: { flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid " + cardBorder, background: inputBg, color: textMain, fontSize: 13, outline: "none" }
      }
    ), /* @__PURE__ */ React.createElement("button", { type: "submit", disabled: isAiLoading, style: { padding: "10px 22px", borderRadius: 10, fontWeight: 700, fontSize: 13, background: isAiLoading ? isDark ? "#21262d" : "#e2e8f0" : "linear-gradient(135deg,#1f6feb,#388bfd)", color: isAiLoading ? textMuted : "#fff", cursor: isAiLoading ? "not-allowed" : "pointer", border: "none" } }, isAiLoading ? "..." : "Send")));
  }
  function FeedView({ user, showNotify, theme }) {
    const isDark = theme !== "light";
    const cardBg = isDark ? "#161b22" : "#ffffff";
    const cardBorder = isDark ? "#30363d" : "#d0d7de";
    const textMain = isDark ? "#e6edf3" : "#1f2328";
    const textMuted = isDark ? "#8b949e" : "#57606a";
    const inputBg = isDark ? "#0d1117" : "#ffffff";
    const innerCardBg = isDark ? "#0d1117" : "#f6f8fa";
    const innerCardBorder = isDark ? "#21262d" : "#e2e8f0";
    const shadow = isDark ? "0 8px 24px rgba(0,0,0,0.3)" : "0 1px 3px rgba(31, 35, 40, 0.08)";
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterCategory, setFilterCategory] = useState("all");
    const [content, setContent] = useState("");
    const [category, setCategory] = useState("project");
    const [codeSnippet, setCodeSnippet] = useState("");
    const [showCodeInput, setShowCodeInput] = useState(false);
    const [imageUrl, setImageUrl] = useState("");
    const [imagePreview, setImagePreview] = useState("");
    const [publishing, setPublishing] = useState(false);
    const fileInputRef = useRef(null);
    const categories = [
      { id: "project", label: "\u{1F680} Project Update", color: "#58a6ff" },
      { id: "idea", label: "\u{1F4A1} Idea & Architecture", color: "#e3b341" },
      { id: "showcase", label: "\u{1F3A8} Design & UI", color: "#d2a8ff" },
      { id: "snippet", label: "\u{1F4BB} Code Snippet", color: "#3fb950" },
      { id: "bug", label: "\u{1F41E} Bug Discussion", color: "#f85149" }
    ];
    const fetchPosts = async () => {
      try {
        setLoading(true);
        const data = await apiCall("/feed");
        setPosts(data.posts || []);
      } catch (err) {
        showNotify(err.message, "error");
      } finally {
        setLoading(false);
      }
    };
    useEffect(() => {
      fetchPosts();
    }, []);
    const handleImageSelect = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        showNotify("Image must be under 5MB", "error");
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        setImageUrl(evt.target.result);
        setImagePreview(evt.target.result);
      };
      reader.readAsDataURL(file);
    };
    const handleRemoveImage = () => {
      setImageUrl("");
      setImagePreview("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    const handlePublishPost = async (e) => {
      e.preventDefault();
      if (!content.trim() && !imageUrl && !codeSnippet.trim()) {
        showNotify("Please enter some text, attach an image, or share a code snippet.", "error");
        return;
      }
      setPublishing(true);
      try {
        await apiCall("/feed", "POST", {
          content: content.trim(),
          image_url: imageUrl,
          code_snippet: codeSnippet.trim(),
          category
        });
        showNotify("Post published to feed! \u{1F680}");
        setContent("");
        setCodeSnippet("");
        setShowCodeInput(false);
        handleRemoveImage();
        fetchPosts();
      } catch (err) {
        showNotify(err.message, "error");
      } finally {
        setPublishing(false);
      }
    };
    const handleToggleLike = async (postId) => {
      try {
        const res = await apiCall(`/feed/${postId}/like`, "POST");
        setPosts((prev) => prev.map((p) => {
          if (p.id === postId) {
            return { ...p, user_has_liked: res.liked, likes_count: res.likes_count };
          }
          return p;
        }));
      } catch (err) {
        showNotify(err.message, "error");
      }
    };
    const handleDeletePost = async (postId) => {
      if (!confirm("Are you sure you want to delete this post?")) return;
      try {
        await apiCall(`/feed/${postId}`, "DELETE");
        showNotify("Post deleted.");
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      } catch (err) {
        showNotify(err.message, "error");
      }
    };
    const filteredPosts = posts.filter((p) => filterCategory === "all" || p.category === filterCategory);
    return /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 1100, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: 24 } }, /* @__PURE__ */ React.createElement("div", { style: {
      background: isDark ? "linear-gradient(135deg, #0d1f47, #161b22)" : "linear-gradient(135deg, #e0f2fe, #f0fdf4)",
      border: "1px solid " + cardBorder,
      borderRadius: 16,
      padding: "28px 32px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 16,
      boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.3)" : "0 4px 16px rgba(0,0,0,0.05)"
    } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 28 } }, "\u{1F4F0}"), /* @__PURE__ */ React.createElement("h1", { style: { margin: 0, fontSize: 24, fontWeight: 900, color: textMain } }, "Community Developer Feed")), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 13, color: textMuted, margin: 0 } }, "Share your coding milestones, architectural concepts, UI designs, and technical updates with the community.")), /* @__PURE__ */ React.createElement("span", { style: {
      fontSize: 12,
      padding: "6px 14px",
      borderRadius: 20,
      fontWeight: 700,
      background: isDark ? "rgba(88,166,255,0.15)" : "#e0f2fe",
      color: isDark ? "#79c0ff" : "#0284c7",
      border: "1px solid " + (isDark ? "rgba(88,166,255,0.3)" : "#bae6fd")
    } }, "Live Community Updates")), user && /* @__PURE__ */ React.createElement("div", { style: { background: cardBg, border: "1px solid " + cardBorder, borderRadius: 16, padding: 24, boxShadow: shadow } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, marginBottom: 14 } }, /* @__PURE__ */ React.createElement(UserAvatar, { user, size: 42 }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: 14, color: textMain } }, user.full_name || user.username || user.email), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: textMuted } }, "Posting to Community Feed"))), /* @__PURE__ */ React.createElement("form", { onSubmit: handlePublishPost, style: { display: "flex", flexDirection: "column", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } }, categories.map((c) => {
      const isSelected = category === c.id;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: c.id,
          type: "button",
          onClick: () => setCategory(c.id),
          style: {
            padding: "5px 14px",
            borderRadius: 20,
            fontSize: 11,
            fontWeight: 700,
            background: isSelected ? isDark ? `${c.color}25` : "#e0f2fe" : isDark ? "#0d1117" : "#f6f8fa",
            color: isSelected ? isDark ? c.color : "#0969da" : textMuted,
            border: `1px solid ${isSelected ? isDark ? c.color : "#bae6fd" : cardBorder}`,
            cursor: "pointer"
          }
        },
        c.label
      );
    })), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        rows: "3",
        placeholder: "What did you build or learn today? Share a feature update, screenshot, or code...",
        value: content,
        onChange: (e) => setContent(e.target.value),
        style: { width: "100%", boxSizing: "border-box", padding: "12px 14px", borderRadius: 10, border: "1px solid " + cardBorder, background: inputBg, color: textMain, fontSize: 13, outline: "none", resize: "vertical" }
      }
    ), imagePreview && /* @__PURE__ */ React.createElement("div", { style: { position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid " + cardBorder, maxHeight: 280, background: innerCardBg } }, /* @__PURE__ */ React.createElement("img", { src: imagePreview, alt: "Attached Preview", style: { width: "100%", maxHeight: 280, objectFit: "contain" } }), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: handleRemoveImage,
        style: { position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.75)", border: "none", color: "#f85149", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontWeight: 800, fontSize: 14 }
      },
      "\u2715"
    )), showCodeInput && /* @__PURE__ */ React.createElement("div", { style: { background: innerCardBg, border: "1px solid " + innerCardBorder, borderRadius: 10, padding: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, fontWeight: 700, color: "#3fb950", fontFamily: "monospace" } }, "\u{1F4BB} Paste Code Snippet"), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => {
      setShowCodeInput(false);
      setCodeSnippet("");
    }, style: { background: "none", border: "none", color: textMuted, fontSize: 12, cursor: "pointer" } }, "Cancel")), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        rows: "6",
        placeholder: "// Paste code here...",
        value: codeSnippet,
        onChange: (e) => setCodeSnippet(e.target.value),
        style: { width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 6, border: "1px solid " + innerCardBorder, background: isDark ? "#010409" : "#ffffff", color: isDark ? "#7ee787" : "#0969da", fontFamily: "monospace", fontSize: 12, outline: "none", lineHeight: 1.5 }
      }
    )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 6, borderTop: "1px solid " + (isDark ? "#21262d" : "#e2e8f0") } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10 } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        ref: fileInputRef,
        type: "file",
        accept: "image/*",
        onChange: handleImageSelect,
        style: { display: "none" }
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => fileInputRef.current?.click(),
        style: { padding: "6px 14px", borderRadius: 8, background: isDark ? "#21262d" : "#f6f8fa", border: "1px solid " + cardBorder, color: isDark ? "#58a6ff" : "#0969da", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }
      },
      "\u{1F5BC}\uFE0F Upload Image"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setShowCodeInput((s) => !s),
        style: { padding: "6px 14px", borderRadius: 8, background: isDark ? "#21262d" : "#f6f8fa", border: "1px solid " + cardBorder, color: isDark ? "#3fb950" : "#15803d", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }
      },
      "\u{1F4BB} Add Code"
    )), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "submit",
        disabled: publishing,
        style: {
          padding: "8px 24px",
          borderRadius: 10,
          fontWeight: 800,
          fontSize: 13,
          background: publishing ? isDark ? "#21262d" : "#e2e8f0" : "linear-gradient(135deg, #238636, #2ea043)",
          color: publishing ? textMuted : "#fff",
          border: "none",
          cursor: publishing ? "not-allowed" : "pointer",
          boxShadow: publishing ? "none" : "0 4px 14px rgba(35,134,54,0.35)"
        }
      },
      publishing ? "Publishing..." : "Publish to Feed \u{1F680}"
    )))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } }, [{ id: "all", label: "All Updates" }, ...categories].map((c) => {
      const isSelected = filterCategory === c.id;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: c.id,
          onClick: () => setFilterCategory(c.id),
          style: {
            padding: "6px 16px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700,
            background: isSelected ? isDark ? "#1f6feb" : "#e0f2fe" : isDark ? "#161b22" : "#ffffff",
            color: isSelected ? isDark ? "#fff" : "#0969da" : textMuted,
            border: `1px solid ${isSelected ? isDark ? "#1f6feb" : "#bae6fd" : cardBorder}`,
            cursor: "pointer"
          }
        },
        c.label
      );
    })), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } }, loading && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "60px 20px", gap: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { width: 36, height: 36, border: "3px solid rgba(88, 166, 255, 0.2)", borderTopColor: "#58a6ff", borderRadius: "50%", animation: "codehubSpin 0.75s linear infinite" } }), /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 600, fontSize: 14, color: "#8b949e" } }, "Loading community feed updates\u2026")), !loading && filteredPosts.map((post) => {
      const catObj = categories.find((c) => c.id === post.category) || categories[0];
      const isAuthorOrAdmin = user && (user.role === "admin" || user.id == post.user_id);
      return /* @__PURE__ */ React.createElement("div", { key: post.id, style: { background: cardBg, border: "1px solid " + cardBorder, borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 14, boxShadow: shadow } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } }, /* @__PURE__ */ React.createElement(UserAvatar, { user: { full_name: post.full_name, username: post.username, email: post.email, avatar_url: post.avatar_url }, size: 42 }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 800, fontSize: 14, color: textMain } }, post.full_name || post.username || post.email), post.role_type === "admin" && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, padding: "1px 6px", borderRadius: 4, background: isDark ? "#3d1f6e" : "#f3e8ff", color: isDark ? "#d2a8ff" : "#7c3aed", fontWeight: 800, textTransform: "uppercase" } }, "ADMIN"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, padding: "2px 8px", borderRadius: 12, fontWeight: 700, background: isDark ? `${catObj.color}20` : "#e0f2fe", color: isDark ? catObj.color : "#0284c7", border: `1px solid ${isDark ? catObj.color + "40" : "#bae6fd"}` } }, catObj.label)), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: textMuted, marginTop: 2 } }, post.username && /* @__PURE__ */ React.createElement("span", { style: { color: isDark ? "#58a6ff" : "#0969da", fontFamily: "monospace" } }, "@", post.username, " \u2022 "), /* @__PURE__ */ React.createElement("span", null, post.created_at)))), isAuthorOrAdmin && /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => handleDeletePost(post.id),
          title: "Delete Post",
          style: { background: "none", border: "none", color: textMuted, cursor: "pointer", fontSize: 14, padding: 4 },
          onMouseEnter: (e) => e.currentTarget.style.color = "#f85149",
          onMouseLeave: (e) => e.currentTarget.style.color = textMuted
        },
        "\u{1F5D1}\uFE0F"
      )), post.content && /* @__PURE__ */ React.createElement("p", { style: { fontSize: 13, color: textMain, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" } }, post.content), post.image_url && /* @__PURE__ */ React.createElement("div", { style: { borderRadius: 10, overflow: "hidden", border: "1px solid " + cardBorder, background: innerCardBg } }, /* @__PURE__ */ React.createElement("img", { src: post.image_url, alt: "Attached Content", style: { width: "100%", maxHeight: 440, objectFit: "contain", display: "block" } })), post.code_snippet && /* @__PURE__ */ React.createElement("div", { style: { background: isDark ? "#010409" : "#f6f8fa", border: "1px solid " + cardBorder, borderRadius: 8, overflow: "hidden" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 12px", background: innerCardBg, borderBottom: "1px solid " + innerCardBorder } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, fontFamily: "monospace", color: isDark ? "#3fb950" : "#15803d", fontWeight: 700 } }, "\u{1F4BB} Code Snippet"), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => {
            navigator.clipboard.writeText(post.code_snippet);
            showNotify("Code copied to clipboard! \u{1F4CB}");
          },
          style: { background: "none", border: "none", color: isDark ? "#58a6ff" : "#0969da", fontSize: 11, cursor: "pointer" }
        },
        "Copy Code"
      )), /* @__PURE__ */ React.createElement("pre", { style: { margin: 0, padding: 14, fontSize: 12, fontFamily: "monospace", color: isDark ? "#7ee787" : "#0969da", overflowX: "auto", lineHeight: 1.5 } }, /* @__PURE__ */ React.createElement("code", null, post.code_snippet))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 16, paddingTop: 10, borderTop: "1px solid " + (isDark ? "#21262d" : "#e2e8f0"), fontSize: 12 } }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => handleToggleLike(post.id),
          style: {
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: post.user_has_liked ? isDark ? "rgba(248,81,73,0.15)" : "#fee2e2" : isDark ? "transparent" : "#f6f8fa",
            border: `1px solid ${post.user_has_liked ? isDark ? "rgba(248,81,73,0.4)" : "#fca5a5" : cardBorder}`,
            color: post.user_has_liked ? "#f85149" : textMuted,
            padding: "5px 14px",
            borderRadius: 20,
            cursor: "pointer",
            fontWeight: 700
          }
        },
        /* @__PURE__ */ React.createElement("span", null, post.user_has_liked ? "\u2764\uFE0F" : "\u{1F90D}"),
        /* @__PURE__ */ React.createElement("span", null, post.likes_count)
      ), /* @__PURE__ */ React.createElement("span", { style: { color: textMuted } }, "\u{1F4AC} Discussion Active")));
    }), !loading && filteredPosts.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: 60, background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, color: textMuted, boxShadow: shadow } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 36, marginBottom: 10 } }, "\u{1F4F0}"), /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontWeight: 700, fontSize: 15, color: textMain } }, "No posts in this category yet."), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 13, marginTop: 4 } }, "Be the first to share your project update or code snippet above!"))));
  }
  function JobsView({ user, showNotify, theme }) {
    const isDark = theme !== "light";
    const isAdmin = Boolean(user && (user.role === "admin" || user.role_type === "admin"));
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState("");
    const [selectedRole, setSelectedRole] = useState("all");
    const [selectedType, setSelectedType] = useState("all");
    const [selectedExp, setSelectedExp] = useState("all");
    const [activeTab, setActiveTab] = useState("browse");
    const [myApplications, setMyApplications] = useState([]);
    const [allApplicants, setAllApplicants] = useState([]);
    const [selectedJobApplicants, setSelectedJobApplicants] = useState([]);
    const [loadingApplicants, setLoadingApplicants] = useState(false);
    const [applicantStatusFilter, setApplicantStatusFilter] = useState("all");
    const [selectedJob, setSelectedJob] = useState(null);
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [isCreateJobOpen, setIsCreateJobOpen] = useState(false);
    const [coverNote, setCoverNote] = useState("");
    const [portfolioUrl, setPortfolioUrl] = useState("");
    const [resumeSummary, setResumeSummary] = useState("");
    const [applying, setApplying] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newCompany, setNewCompany] = useState("");
    const [newRole, setNewRole] = useState("Full Stack");
    const [newType, setNewType] = useState("Full-time");
    const [newExp, setNewExp] = useState("Mid Level");
    const [newSalary, setNewSalary] = useState("$120k - $160k / yr");
    const [newLocation, setNewLocation] = useState("Remote");
    const [newDesc, setNewDesc] = useState("");
    const [newReqs, setNewReqs] = useState("");
    const [newSkills, setNewSkills] = useState("");
    const [newImageUrl, setNewImageUrl] = useState("");
    const [creatingJob, setCreatingJob] = useState(false);
    const [uploadingJobImage, setUploadingJobImage] = useState(false);
    const ROLE_DEFAULT_IMAGES = {
      "Full Stack": "/uploads/jobs/role_full_stack.jpg",
      "Frontend": "/uploads/jobs/role_frontend.jpg",
      "Backend": "/uploads/jobs/role_backend.jpg",
      "AI / ML Engineer": "/uploads/jobs/role_ai_ml.jpg",
      "DevOps / Cloud": "/uploads/jobs/role_devops.jpg",
      "Mobile Developer": "/uploads/jobs/role_mobile.jpg",
      "Cybersecurity": "/uploads/jobs/role_cybersecurity.jpg",
      "UI/UX & Product": "/uploads/jobs/role_ui_ux.jpg",
      "Engineering Manager": "/uploads/jobs/role_engineering_manager.jpg",
      "QA & Testing": "/uploads/jobs/job_42_qa_testing.jpg",
      "Data Engineer": "/uploads/jobs/job_17_data_engineer.jpg",
      "Blockchain & Web3": "/uploads/jobs/job_44_blockchain_web3.jpg",
      "Other": "/uploads/jobs/role_other.jpg"
    };
    const getRoleFallbackImage = (role) => {
      return ROLE_DEFAULT_IMAGES[role] || ROLE_DEFAULT_IMAGES["Full Stack"];
    };
    const rolesList = [
      "All Roles",
      "Full Stack",
      "Frontend",
      "Backend",
      "AI / ML Engineer",
      "DevOps / Cloud",
      "Mobile Developer",
      "Cybersecurity",
      "UI/UX & Product",
      "Engineering Manager",
      "QA & Testing",
      "Data Engineer",
      "Blockchain & Web3",
      "Other"
    ];
    const typesList = ["All Types", "Full-time", "Part-time", "Contract", "Remote", "Internship"];
    const expList = ["All Levels", "Entry Level", "Mid Level", "Senior", "Lead / Staff"];
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (keyword.trim()) params.append("keyword", keyword.trim());
        if (selectedRole !== "all") params.append("role", selectedRole);
        if (selectedType !== "all") params.append("type", selectedType);
        if (selectedExp !== "all") params.append("experience", selectedExp);
        const queryString = params.toString() ? "?" + params.toString() : "";
        const res = await apiCall("/jobs" + queryString);
        setJobs(res.jobs || []);
      } catch (err) {
        showNotify(err.message, "error");
      } finally {
        setLoading(false);
      }
    };
    const fetchMyApplications = async () => {
      if (!user || isAdmin) return;
      try {
        const res = await apiCall("/jobs/my-applications");
        setMyApplications(res.applications || []);
      } catch (err) {
      }
    };
    const fetchAllApplicants = async () => {
      if (!isAdmin) return;
      try {
        setLoadingApplicants(true);
        const res = await apiCall("/admin/jobs-applications");
        setAllApplicants(res.applications || []);
      } catch (err) {
        showNotify(err.message, "error");
      } finally {
        setLoadingApplicants(false);
      }
    };
    const fetchJobApplicants = async (jobId) => {
      if (!isAdmin || !jobId) return;
      try {
        const res = await apiCall(`/admin/jobs/${jobId}/applicants`);
        setSelectedJobApplicants(res.applications || []);
      } catch (err) {
        setSelectedJobApplicants([]);
      }
    };
    useEffect(() => {
      fetchJobs();
    }, [selectedRole, selectedType, selectedExp]);
    useEffect(() => {
      if (user) {
        if (isAdmin) {
          fetchAllApplicants();
        } else {
          fetchMyApplications();
        }
      }
    }, [user, isAdmin]);
    const handleSearchSubmit = (e) => {
      e.preventDefault();
      fetchJobs();
    };
    const handleApply = async (e) => {
      e.preventDefault();
      if (isAdmin) {
        showNotify("Administrators manage job postings and cannot apply for jobs.", "error");
        return;
      }
      if (!selectedJob) return;
      setApplying(true);
      try {
        await apiCall("/jobs/" + selectedJob.id + "/apply", "POST", {
          cover_note: coverNote,
          portfolio_url: portfolioUrl,
          resume_summary: resumeSummary
        });
        showNotify("Application submitted for " + selectedJob.title + " at " + selectedJob.company + "! \u{1F680}");
        setIsApplyModalOpen(false);
        setCoverNote("");
        setPortfolioUrl("");
        setResumeSummary("");
        fetchMyApplications();
        fetchJobs();
      } catch (err) {
        showNotify(err.message, "error");
      } finally {
        setApplying(false);
      }
    };
    const handleToggleJobStatus = async (jobId, currentStatus) => {
      if (!isAdmin) return;
      const newStatus = currentStatus === "open" ? "closed" : "open";
      try {
        await apiCall(`/admin/jobs/${jobId}`, "PUT", { status: newStatus });
        showNotify(`Job status changed to ${newStatus.toUpperCase()}!`);
        fetchJobs();
        if (selectedJob && selectedJob.id === jobId) {
          setSelectedJob((prev) => ({ ...prev, status: newStatus }));
        }
      } catch (err) {
        showNotify(err.message, "error");
      }
    };
    const handleDeleteJob = async (jobId, title) => {
      if (!isAdmin) return;
      if (!window.confirm(`Are you sure you want to permanently delete the job posting "${title}"?`)) return;
      try {
        await apiCall(`/admin/jobs/${jobId}`, "DELETE");
        showNotify(`Job "${title}" deleted successfully!`);
        setIsApplyModalOpen(false);
        setSelectedJob(null);
        fetchJobs();
        fetchAllApplicants();
      } catch (err) {
        showNotify(err.message, "error");
      }
    };
    const handleUpdateApplicantStatus = async (appId, newStatus) => {
      if (!isAdmin) return;
      try {
        await apiCall(`/admin/jobs/applications/${appId}/status`, "PUT", { status: newStatus });
        showNotify(`Candidate status updated to ${newStatus.replace("_", " ").toUpperCase()}!`);
        fetchAllApplicants();
        if (selectedJob) {
          fetchJobApplicants(selectedJob.id);
        }
      } catch (err) {
        showNotify(err.message, "error");
      }
    };
    const handleJobImageUpload = async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        setUploadingJobImage(true);
        const formData = new FormData();
        formData.append("image", file);
        const token = localStorage.getItem("token");
        const res = await fetch("/api/jobs/upload-image", {
          method: "POST",
          headers: {
            ...token ? { "Authorization": "Bearer " + token } : {}
          },
          body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to upload image");
        setNewImageUrl(data.image_url);
        showNotify("Image uploaded and stored in folder! \u{1F4C1}");
      } catch (err) {
        showNotify(err.message, "error");
      } finally {
        setUploadingJobImage(false);
        if (e.target) e.target.value = "";
      }
    };
    const handleCreateJob = async (e) => {
      e.preventDefault();
      if (!isAdmin) {
        showNotify("Only administrators can publish new job opportunities.", "error");
        return;
      }
      if (!newTitle.trim() || !newCompany.trim() || !newDesc.trim()) {
        showNotify("Please fill in Title, Company, and Description", "error");
        return;
      }
      setCreatingJob(true);
      try {
        const reqsArray = newReqs.split("\n").map((s) => s.trim()).filter(Boolean);
        const skillsArray = newSkills.split(",").map((s) => s.trim()).filter(Boolean);
        await apiCall("/jobs", "POST", {
          title: newTitle.trim(),
          company: newCompany.trim(),
          role: newRole,
          type: newType,
          experienceLevel: newExp,
          salary: newSalary.trim(),
          location: newLocation.trim(),
          description: newDesc.trim(),
          requirements: reqsArray,
          skills: skillsArray,
          image_url: newImageUrl.trim()
        });
        showNotify("New job opportunity published successfully! \u{1F389}");
        setIsCreateJobOpen(false);
        setNewTitle("");
        setNewCompany("");
        setNewDesc("");
        setNewReqs("");
        setNewSkills("");
        setNewImageUrl("");
        fetchJobs();
      } catch (err) {
        showNotify(err.message, "error");
      } finally {
        setCreatingJob(false);
      }
    };
    const cardBg = isDark ? "#161b22" : "#ffffff";
    const cardBorder = isDark ? "#30363d" : "#d0d7de";
    const textMain = isDark ? "#e6edf3" : "#1f2328";
    const textMuted = isDark ? "#8b949e" : "#57606a";
    const inputBg = isDark ? "#0d1117" : "#ffffff";
    const appliedJobIds = new Set(myApplications.map((a) => a.job_id));
    const statusBadgeColors = {
      applied: { bg: "rgba(88,166,255,0.15)", text: "#58a6ff", border: "rgba(88,166,255,0.4)" },
      under_review: { bg: "rgba(227,179,65,0.15)", text: "#e3b341", border: "rgba(227,179,65,0.4)" },
      interviewing: { bg: "rgba(210,168,255,0.15)", text: "#d2a8ff", border: "rgba(210,168,255,0.4)" },
      accepted: { bg: "rgba(63,185,80,0.15)", text: "#3fb950", border: "rgba(63,185,80,0.4)" },
      rejected: { bg: "rgba(248,81,73,0.15)", text: "#f85149", border: "rgba(248,81,73,0.4)" }
    };
    const filteredApplicants = allApplicants.filter(
      (a) => applicantStatusFilter === "all" || a.status === applicantStatusFilter
    );
    return /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 1360, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: 24 } }, /* @__PURE__ */ React.createElement("style", null, `
                .codehub-jobs-grid {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 16px;
                }
                @media (max-width: 1200px) {
                    .codehub-jobs-grid {
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                    }
                }
                @media (max-width: 860px) {
                    .codehub-jobs-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                }
                @media (max-width: 560px) {
                    .codehub-jobs-grid {
                        grid-template-columns: 1fr;
                    }
                }
                .codehub-job-card {
                    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
                }
                .codehub-job-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;
                }
                .codehub-job-card:hover .codehub-job-img {
                    transform: scale(1.04);
                }
            `), /* @__PURE__ */ React.createElement("div", { style: {
      background: isDark ? isAdmin ? "linear-gradient(135deg, #1f1035, #161b22)" : "linear-gradient(135deg, #0d1f47, #161b22)" : isAdmin ? "linear-gradient(135deg, #f5f0ff, #f0fdf4)" : "linear-gradient(135deg, #e0f2fe, #f0fdf4)",
      border: "1px solid " + (isAdmin ? "rgba(210,168,255,0.4)" : cardBorder),
      borderRadius: 16,
      padding: "28px 32px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 16,
      boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.3)" : "0 4px 16px rgba(0,0,0,0.05)"
    } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 28 } }, isAdmin ? "\u{1F6E1}\uFE0F" : "\u{1F4BC}"), /* @__PURE__ */ React.createElement("h1", { style: { margin: 0, fontSize: 24, fontWeight: 900, color: textMain } }, isAdmin ? "Developer Career Hub & Job Management (Admin)" : "Developer Career Hub & Job Search")), /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: 14, color: textMuted, maxWidth: 680, lineHeight: 1.5 } }, isAdmin ? "Administrator Talent Console: Post and manage company opportunities, toggle open/closed statuses, and review candidate applicant pipelines. Admins only handle jobs and cannot apply." : "Discover engineering opportunities matching your developer stack, framework expertise, and preferred role. Connected live to MongoDB Compass.")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 12, alignItems: "center" } }, isAdmin ? /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setIsCreateJobOpen(true),
        style: {
          padding: "11px 22px",
          borderRadius: 12,
          fontWeight: 800,
          fontSize: 13,
          background: "linear-gradient(135deg, #238636, #2ea043)",
          color: "#ffffff",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          boxShadow: "0 4px 12px rgba(35,134,54,0.3)"
        }
      },
      /* @__PURE__ */ React.createElement("span", null, "\u2795"),
      " Post a Job"
    ) : /* @__PURE__ */ React.createElement("div", { style: {
      padding: "6px 14px",
      borderRadius: 10,
      background: isDark ? "rgba(88,166,255,0.1)" : "#eff6ff",
      border: "1px solid rgba(88,166,255,0.3)",
      fontSize: 12,
      fontWeight: 700,
      color: "#58a6ff"
    } }, "Developer Mode (Apply Open)"))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 12, borderBottom: "1px solid " + cardBorder, paddingBottom: 12 } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setActiveTab("browse"),
        style: {
          padding: "8px 18px",
          borderRadius: 12,
          fontWeight: 700,
          fontSize: 14,
          background: activeTab === "browse" ? isDark ? "#21262d" : "#e2e8f0" : "transparent",
          color: activeTab === "browse" ? "#58a6ff" : textMuted,
          border: activeTab === "browse" ? "1px solid rgba(88,166,255,0.4)" : "1px solid transparent",
          cursor: "pointer"
        }
      },
      "\u{1F50D} ",
      isAdmin ? "Browse & Manage Jobs" : "Browse Jobs",
      " (",
      jobs.length,
      ")"
    ), isAdmin ? /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setActiveTab("all_applicants");
          fetchAllApplicants();
        },
        style: {
          padding: "8px 18px",
          borderRadius: 12,
          fontWeight: 700,
          fontSize: 14,
          background: activeTab === "all_applicants" ? isDark ? "#21262d" : "#e2e8f0" : "transparent",
          color: activeTab === "all_applicants" ? "#d2a8ff" : textMuted,
          border: activeTab === "all_applicants" ? "1px solid rgba(210,168,255,0.4)" : "1px solid transparent",
          cursor: "pointer"
        }
      },
      "\u{1F465} Candidate Applicants (",
      allApplicants.length,
      ")"
    ) : user ? /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setActiveTab("my_apps");
          fetchMyApplications();
        },
        style: {
          padding: "8px 18px",
          borderRadius: 12,
          fontWeight: 700,
          fontSize: 14,
          background: activeTab === "my_apps" ? isDark ? "#21262d" : "#e2e8f0" : "transparent",
          color: activeTab === "my_apps" ? "#3fb950" : textMuted,
          border: activeTab === "my_apps" ? "1px solid rgba(63,185,80,0.4)" : "1px solid transparent",
          cursor: "pointer"
        }
      },
      "\u{1F4CB} My Applications (",
      myApplications.length,
      ")"
    ) : null), activeTab === "browse" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: {
      background: cardBg,
      border: "1px solid " + cardBorder,
      borderRadius: 14,
      padding: 18,
      display: "flex",
      flexDirection: "column",
      gap: 14
    } }, /* @__PURE__ */ React.createElement("form", { onSubmit: handleSearchSubmit, style: { display: "flex", gap: 10, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, minWidth: 260, position: "relative" } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: keyword,
        onChange: (e) => setKeyword(e.target.value),
        placeholder: "Search by title, company, skills (e.g. React, MongoDB, Node.js)...",
        style: {
          width: "100%",
          padding: "11px 16px",
          borderRadius: 10,
          border: "1px solid " + cardBorder,
          background: inputBg,
          color: textMain,
          fontSize: 14,
          outline: "none"
        }
      }
    )), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "submit",
        style: {
          padding: "11px 22px",
          borderRadius: 10,
          background: "#1f6feb",
          color: "#fff",
          fontWeight: 700,
          fontSize: 14,
          border: "none",
          cursor: "pointer"
        }
      },
      "\u{1F50D} Search"
    ), keyword && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => {
          setKeyword("");
          setTimeout(fetchJobs, 10);
        },
        style: {
          padding: "11px 16px",
          borderRadius: 10,
          background: "transparent",
          color: textMuted,
          border: "1px solid " + cardBorder,
          cursor: "pointer"
        }
      },
      "Clear"
    )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: textMuted } }, "Role:"), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: selectedRole,
        onChange: (e) => setSelectedRole(e.target.value),
        style: {
          padding: "7px 12px",
          borderRadius: 8,
          border: "1px solid " + cardBorder,
          background: inputBg,
          color: textMain,
          fontSize: 13
        }
      },
      rolesList.map((r) => /* @__PURE__ */ React.createElement("option", { key: r, value: r === "All Roles" ? "all" : r }, r))
    )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: textMuted } }, "Type:"), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: selectedType,
        onChange: (e) => setSelectedType(e.target.value),
        style: {
          padding: "7px 12px",
          borderRadius: 8,
          border: "1px solid " + cardBorder,
          background: inputBg,
          color: textMain,
          fontSize: 13
        }
      },
      typesList.map((t) => /* @__PURE__ */ React.createElement("option", { key: t, value: t === "All Types" ? "all" : t }, t))
    )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 6 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: textMuted } }, "Experience:"), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: selectedExp,
        onChange: (e) => setSelectedExp(e.target.value),
        style: {
          padding: "7px 12px",
          borderRadius: 8,
          border: "1px solid " + cardBorder,
          background: inputBg,
          color: textMain,
          fontSize: 13
        }
      },
      expList.map((exp) => /* @__PURE__ */ React.createElement("option", { key: exp, value: exp === "All Levels" ? "all" : exp }, exp))
    ))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } }, ["all", "Full Stack", "Frontend", "Backend", "AI / ML Engineer", "DevOps / Cloud", "Mobile Developer"].map((r) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: r,
        onClick: () => setSelectedRole(r),
        style: {
          padding: "4px 12px",
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 600,
          background: selectedRole === r ? "rgba(88,166,255,0.2)" : "transparent",
          color: selectedRole === r ? "#58a6ff" : textMuted,
          border: "1px solid " + (selectedRole === r ? "#58a6ff" : cardBorder),
          cursor: "pointer"
        }
      },
      r === "all" ? "All Roles" : r
    )))), loading ? /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 50, gap: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { width: 36, height: 36, border: "3px solid rgba(88, 166, 255, 0.2)", borderTopColor: "#58a6ff", borderRadius: "50%", animation: "codehubSpin 0.75s linear infinite" } }), /* @__PURE__ */ React.createElement("div", { style: { color: textMuted, fontSize: 13, fontWeight: 500 } }, "Querying live job listings from MongoDB...")) : jobs.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: {
      textAlign: "center",
      padding: 60,
      background: cardBg,
      border: "1px solid " + cardBorder,
      borderRadius: 14,
      color: textMuted
    } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 42, marginBottom: 12 } }, "\u{1F4BC}"), /* @__PURE__ */ React.createElement("h3", { style: { margin: 0, fontWeight: 700, color: textMain } }, "No job postings match your filters"), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 13, marginTop: 6 } }, "Try clearing your search keyword or switching the role dropdown."), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setKeyword("");
          setSelectedRole("all");
          setSelectedType("all");
          setSelectedExp("all");
        },
        style: {
          marginTop: 14,
          padding: "8px 18px",
          borderRadius: 10,
          background: "#1f6feb",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: 13
        }
      },
      "Reset All Filters"
    )) : /* @__PURE__ */ React.createElement("div", { className: "codehub-jobs-grid", style: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16 } }, jobs.map((job) => {
      const hasApplied = appliedJobIds.has(job.id);
      const isJobOpen = job.status === "open";
      const jobImgSrc = job.image_url || getRoleFallbackImage(job.role);
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: job.id,
          className: "codehub-job-card",
          style: {
            background: cardBg,
            border: "1px solid " + (isJobOpen ? cardBorder : "rgba(248,81,73,0.3)"),
            borderRadius: 14,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow: isDark ? "0 2px 8px rgba(0,0,0,0.2)" : "0 2px 8px rgba(0,0,0,0.04)",
            position: "relative"
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: {
          position: "relative",
          width: "100%",
          height: 135,
          background: isDark ? "#21262d" : "#e2e8f0",
          overflow: "hidden"
        } }, /* @__PURE__ */ React.createElement(
          "img",
          {
            className: "codehub-job-img",
            src: jobImgSrc,
            alt: job.title,
            onError: (e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = getRoleFallbackImage(job.role);
            },
            style: {
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              transition: "transform 0.3s ease"
            }
          }
        ), /* @__PURE__ */ React.createElement("span", { style: {
          position: "absolute",
          top: 10,
          right: 10,
          padding: "3px 8px",
          borderRadius: 12,
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: "0.5px",
          background: isJobOpen ? "rgba(35, 134, 54, 0.92)" : "rgba(218, 54, 51, 0.92)",
          color: "#ffffff",
          boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
          backdropFilter: "blur(4px)"
        } }, isJobOpen ? "\u{1F7E2} OPEN" : "\u{1F534} CLOSED"), /* @__PURE__ */ React.createElement("span", { style: {
          position: "absolute",
          bottom: 10,
          left: 10,
          padding: "3px 9px",
          borderRadius: 10,
          fontSize: 11,
          fontWeight: 700,
          background: "rgba(15, 23, 42, 0.88)",
          color: "#58a6ff",
          border: "1px solid rgba(88, 166, 255, 0.3)",
          backdropFilter: "blur(6px)",
          maxWidth: "75%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        } }, job.role), /* @__PURE__ */ React.createElement("span", { style: {
          position: "absolute",
          bottom: 10,
          right: 10,
          padding: "3px 8px",
          borderRadius: 10,
          fontSize: 10,
          fontWeight: 700,
          background: "rgba(15, 23, 42, 0.85)",
          color: "#3fb950",
          border: "1px solid rgba(63, 185, 80, 0.3)",
          backdropFilter: "blur(6px)"
        } }, job.type)),
        /* @__PURE__ */ React.createElement("div", { style: {
          padding: "14px 16px",
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "space-between",
          gap: 10
        } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          fontSize: 12,
          marginBottom: 4
        } }, /* @__PURE__ */ React.createElement("span", { style: {
          fontWeight: 700,
          color: textMain,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          maxWidth: "65%"
        } }, "\u{1F3E2} ", job.company), /* @__PURE__ */ React.createElement("span", { style: {
          color: textMuted,
          fontSize: 11,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        } }, "\u{1F4CD} ", job.location)), /* @__PURE__ */ React.createElement(
          "h3",
          {
            title: job.title,
            style: {
              margin: "4px 0 6px 0",
              fontSize: 15,
              fontWeight: 800,
              color: textMain,
              lineHeight: 1.35,
              minHeight: 40,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden"
            }
          },
          job.title
        ), /* @__PURE__ */ React.createElement("div", { style: {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 6,
          marginBottom: 8
        } }, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 800, fontSize: 13, color: "#2da44e" } }, "\u{1F4B0} ", job.salary), /* @__PURE__ */ React.createElement("span", { style: {
          fontSize: 11,
          fontWeight: 600,
          color: textMuted,
          padding: "2px 6px",
          borderRadius: 6,
          background: isDark ? "#21262d" : "#f1f5f9"
        } }, job.experienceLevel)), /* @__PURE__ */ React.createElement("p", { style: {
          margin: "0 0 10px 0",
          fontSize: 12,
          color: textMuted,
          lineHeight: 1.45,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden"
        } }, job.description), job.skills && job.skills.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center", marginBottom: 6 } }, job.skills.slice(0, 3).map((skill, sIdx) => /* @__PURE__ */ React.createElement(
          "span",
          {
            key: sIdx,
            style: {
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: 6,
              background: isDark ? "#21262d" : "#f1f5f9",
              color: textMain,
              border: "1px solid " + cardBorder,
              fontWeight: 600
            }
          },
          skill
        )), job.skills.length > 3 && /* @__PURE__ */ React.createElement("span", { style: {
          fontSize: 10,
          padding: "2px 5px",
          borderRadius: 6,
          background: isDark ? "rgba(88,166,255,0.1)" : "#eff6ff",
          color: "#58a6ff",
          fontWeight: 700
        } }, "+", job.skills.length - 3))), /* @__PURE__ */ React.createElement("div", { style: { borderTop: "1px solid " + cardBorder, paddingTop: 10 } }, isAdmin ? /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center" } }, /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => {
              setSelectedJob(job);
              fetchJobApplicants(job.id);
              setIsApplyModalOpen(true);
            },
            style: {
              flex: 1,
              padding: "7px 8px",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 11,
              background: "#1f6feb",
              color: "#ffffff",
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }
          },
          "\u2699\uFE0F Manage (",
          job.applicants_count || 0,
          ")"
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => handleToggleJobStatus(job.id, job.status),
            title: "Toggle Open / Closed status",
            style: {
              padding: "7px 8px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              background: isJobOpen ? "rgba(248,81,73,0.15)" : "rgba(63,185,80,0.15)",
              color: isJobOpen ? "#f85149" : "#3fb950",
              border: "1px solid " + (isJobOpen ? "rgba(248,81,73,0.3)" : "rgba(63,185,80,0.3)"),
              cursor: "pointer"
            }
          },
          isJobOpen ? "Close" : "Re-open"
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => handleDeleteJob(job.id, job.title),
            title: "Delete Job Posting",
            style: {
              padding: "7px 8px",
              borderRadius: 8,
              fontSize: 12,
              background: "rgba(248,81,73,0.1)",
              color: "#f85149",
              border: "1px solid rgba(248,81,73,0.3)",
              cursor: "pointer"
            }
          },
          "\u{1F5D1}\uFE0F"
        )) : /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, alignItems: "center" } }, hasApplied ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { style: {
          padding: "6px 10px",
          borderRadius: 8,
          fontSize: 11,
          fontWeight: 800,
          background: "rgba(63,185,80,0.15)",
          color: "#3fb950",
          border: "1px solid rgba(63,185,80,0.3)",
          display: "flex",
          alignItems: "center",
          gap: 4
        } }, "\u2713 Applied"), /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => {
              setSelectedJob(job);
              setIsApplyModalOpen(true);
            },
            style: {
              flex: 1,
              padding: "7px 10px",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 12,
              background: "transparent",
              color: "#58a6ff",
              border: "1px solid #1f6feb",
              cursor: "pointer"
            }
          },
          "Details"
        )) : /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => {
              setSelectedJob(job);
              setIsApplyModalOpen(true);
            },
            style: {
              width: "100%",
              padding: "8px 12px",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 12,
              background: "#1f6feb",
              color: "#ffffff",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6
            }
          },
          /* @__PURE__ */ React.createElement("span", null, "View & Apply"),
          /* @__PURE__ */ React.createElement("span", null, "\u2192")
        ))))
      );
    }))), activeTab === "all_applicants" && isAdmin && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } }, /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 12,
      background: cardBg,
      border: "1px solid " + cardBorder,
      borderRadius: 12,
      padding: "12px 18px"
    } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 800, fontSize: 14, color: textMain } }, "Filter by Application Review Stage:"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } }, ["all", "applied", "under_review", "interviewing", "accepted", "rejected"].map((st) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: st,
        onClick: () => setApplicantStatusFilter(st),
        style: {
          padding: "5px 12px",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          textTransform: "capitalize",
          background: applicantStatusFilter === st ? "#1f6feb" : "transparent",
          color: applicantStatusFilter === st ? "#ffffff" : textMuted,
          border: "1px solid " + (applicantStatusFilter === st ? "#1f6feb" : cardBorder),
          cursor: "pointer"
        }
      },
      st.replace("_", " ")
    )))), loadingApplicants ? /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: 50, color: textMuted } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 32, marginBottom: 8 } }, "\u23F3"), /* @__PURE__ */ React.createElement("div", null, "Loading applicants from MongoDB Compass...")) : filteredApplicants.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: {
      textAlign: "center",
      padding: 60,
      background: cardBg,
      border: "1px solid " + cardBorder,
      borderRadius: 14,
      color: textMuted
    } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 40, marginBottom: 10 } }, "\u{1F465}"), /* @__PURE__ */ React.createElement("h3", { style: { margin: 0, color: textMain } }, "No candidate applications found in this stage"), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 13, marginTop: 4 } }, "When developers apply to posted roles, their details appear here for admin review.")) : /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } }, filteredApplicants.map((app) => {
      const st = statusBadgeColors[app.status] || statusBadgeColors.applied;
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: app.id,
          style: {
            background: cardBg,
            border: "1px solid " + cardBorder,
            borderRadius: 14,
            padding: "18px 22px",
            display: "flex",
            flexDirection: "column",
            gap: 12
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 16, fontWeight: 800, color: textMain } }, "\u{1F464} ", app.user_name || "Developer Candidate"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, color: textMuted } }, "(", app.user_email, ")"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, padding: "2px 8px", borderRadius: 8, background: "rgba(88,166,255,0.15)", color: "#58a6ff" } }, app.user_role || "user")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: textMuted, marginTop: 4 } }, "Applied for: ", /* @__PURE__ */ React.createElement("strong", { style: { color: textMain } }, app.job_title), " at ", /* @__PURE__ */ React.createElement("span", null, app.job_company), /* @__PURE__ */ React.createElement("span", { style: { marginLeft: 12 } }, "\u{1F4C5} ", new Date(app.applied_at).toLocaleDateString()))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, fontWeight: 700, color: textMuted } }, "Stage:"), /* @__PURE__ */ React.createElement(
          "select",
          {
            value: app.status,
            onChange: (e) => handleUpdateApplicantStatus(app.id, e.target.value),
            style: {
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid " + st.border,
              background: st.bg,
              color: st.text,
              fontSize: 12,
              fontWeight: 800,
              outline: "none",
              cursor: "pointer"
            }
          },
          /* @__PURE__ */ React.createElement("option", { value: "applied" }, "APPLIED"),
          /* @__PURE__ */ React.createElement("option", { value: "under_review" }, "UNDER REVIEW"),
          /* @__PURE__ */ React.createElement("option", { value: "interviewing" }, "INTERVIEWING"),
          /* @__PURE__ */ React.createElement("option", { value: "accepted" }, "ACCEPTED"),
          /* @__PURE__ */ React.createElement("option", { value: "rejected" }, "REJECTED")
        ))),
        app.cover_note && /* @__PURE__ */ React.createElement("div", { style: {
          padding: "10px 14px",
          borderRadius: 8,
          background: isDark ? "#0d1117" : "#f8fafc",
          border: "1px solid " + cardBorder,
          fontSize: 13,
          color: textMain,
          lineHeight: 1.5
        } }, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: 11, textTransform: "uppercase", color: textMuted, display: "block", marginBottom: 2 } }, "Pitch / Cover Note:"), '"', app.cover_note, '"'),
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 16, fontSize: 12, color: textMuted, flexWrap: "wrap" } }, app.portfolio_url && /* @__PURE__ */ React.createElement("a", { href: app.portfolio_url, target: "_blank", rel: "noreferrer", style: { color: "#58a6ff", fontWeight: 700, textDecoration: "none" } }, "\u{1F517} Portfolio / GitHub: ", app.portfolio_url), app.resume_summary && /* @__PURE__ */ React.createElement("span", null, "\u{1F4C4} Resume Note: ", /* @__PURE__ */ React.createElement("strong", { style: { color: textMain } }, app.resume_summary)))
      );
    }))), activeTab === "my_apps" && !isAdmin && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } }, myApplications.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: {
      textAlign: "center",
      padding: 60,
      background: cardBg,
      border: "1px solid " + cardBorder,
      borderRadius: 14,
      color: textMuted
    } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 40, marginBottom: 10 } }, "\u{1F4DD}"), /* @__PURE__ */ React.createElement("h3", { style: { margin: 0, color: textMain } }, "You haven't submitted any job applications yet"), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 13, marginTop: 4 } }, "Switch to the Browse Jobs tab to explore engineering opportunities."), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setActiveTab("browse"),
        style: {
          marginTop: 12,
          padding: "8px 18px",
          borderRadius: 10,
          background: "#1f6feb",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          fontWeight: 700
        }
      },
      "Browse Jobs Now"
    )) : myApplications.map((app) => {
      const st = statusBadgeColors[app.status] || statusBadgeColors.applied;
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: app.id,
          style: {
            background: cardBg,
            border: "1px solid " + cardBorder,
            borderRadius: 14,
            padding: "20px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12
          }
        },
        /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 4 } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: 0, fontSize: 16, fontWeight: 800, color: textMain } }, app.job_title), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: textMuted } }, "at ", app.job_company)), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: textMuted, display: "flex", gap: 12 } }, /* @__PURE__ */ React.createElement("span", null, "\u{1F4C5} Applied: ", new Date(app.applied_at).toLocaleDateString()), app.job_role && /* @__PURE__ */ React.createElement("span", null, "\u{1F3AF} Role: ", app.job_role)), app.cover_note && /* @__PURE__ */ React.createElement("p", { style: { margin: "8px 0 0 0", fontSize: 12, color: textMuted, fontStyle: "italic" } }, '"', app.cover_note.slice(0, 140), '..."')),
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12 } }, /* @__PURE__ */ React.createElement("span", { style: {
          padding: "6px 14px",
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 800,
          background: st.bg,
          color: st.text,
          border: "1px solid " + st.border,
          textTransform: "uppercase"
        } }, app.status.replace("_", " ")))
      );
    })), isApplyModalOpen && selectedJob && /* @__PURE__ */ React.createElement(Modal, { onClose: () => setIsApplyModalOpen(false), title: selectedJob.title }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16, maxHeight: "72vh", overflowY: "auto", paddingRight: 4 } }, /* @__PURE__ */ React.createElement("div", { style: {
      width: "100%",
      height: 170,
      borderRadius: 12,
      overflow: "hidden",
      position: "relative",
      background: isDark ? "#21262d" : "#e2e8f0",
      border: "1px solid " + cardBorder
    } }, /* @__PURE__ */ React.createElement(
      "img",
      {
        src: selectedJob.image_url || getRoleFallbackImage(selectedJob.role),
        alt: selectedJob.title,
        onError: (e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = getRoleFallbackImage(selectedJob.role);
        },
        style: { width: "100%", height: "100%", objectFit: "cover", display: "block" }
      }
    ), /* @__PURE__ */ React.createElement("div", { style: {
      position: "absolute",
      top: 12,
      right: 12,
      padding: "4px 12px",
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 800,
      background: selectedJob.status === "open" ? "rgba(35, 134, 54, 0.95)" : "rgba(218, 54, 51, 0.95)",
      color: "#ffffff",
      boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
      backdropFilter: "blur(4px)"
    } }, selectedJob.status === "open" ? "\u{1F7E2} OPEN POSITION" : "\u{1F534} POSITION CLOSED"), /* @__PURE__ */ React.createElement("div", { style: {
      position: "absolute",
      bottom: 12,
      left: 12,
      padding: "4px 12px",
      borderRadius: 10,
      fontSize: 12,
      fontWeight: 800,
      background: "rgba(15, 23, 42, 0.88)",
      color: "#58a6ff",
      border: "1px solid rgba(88, 166, 255, 0.3)",
      backdropFilter: "blur(6px)"
    } }, "\u{1F3AF} ", selectedJob.role)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", borderBottom: "1px solid " + cardBorder, paddingBottom: 12 } }, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 800, color: textMain, fontSize: 15 } }, "\u{1F3E2} ", selectedJob.company), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, color: textMuted } }, "\u{1F4CD} ", selectedJob.location), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 13, fontWeight: 700, color: "#3fb950" } }, "\u{1F4B0} ", selectedJob.salary), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, padding: "2px 8px", borderRadius: 8, background: "rgba(88,166,255,0.15)", color: "#58a6ff" } }, selectedJob.role), /* @__PURE__ */ React.createElement("span", { style: {
      fontSize: 12,
      padding: "2px 8px",
      borderRadius: 8,
      background: selectedJob.status === "open" ? "rgba(63,185,80,0.15)" : "rgba(248,81,73,0.15)",
      color: selectedJob.status === "open" ? "#3fb950" : "#f85149"
    } }, selectedJob.status === "open" ? "\u{1F7E2} Open" : "\u{1F534} Closed")), isAdmin && /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px 16px",
      borderRadius: 10,
      background: isDark ? "rgba(210,168,255,0.08)" : "#fdf4ff",
      border: "1px solid rgba(210,168,255,0.25)",
      flexWrap: "wrap",
      gap: 10
    } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: textMain } }, "\u{1F6E1}\uFE0F Admin Actions:"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10 } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => handleToggleJobStatus(selectedJob.id, selectedJob.status),
        style: {
          padding: "6px 14px",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          background: selectedJob.status === "open" ? "rgba(248,81,73,0.15)" : "rgba(63,185,80,0.15)",
          color: selectedJob.status === "open" ? "#f85149" : "#3fb950",
          border: "1px solid " + (selectedJob.status === "open" ? "rgba(248,81,73,0.4)" : "rgba(63,185,80,0.4)"),
          cursor: "pointer"
        }
      },
      selectedJob.status === "open" ? "Mark as Closed" : "Reopen Position"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => handleDeleteJob(selectedJob.id, selectedJob.title),
        style: {
          padding: "6px 14px",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 700,
          background: "rgba(248,81,73,0.15)",
          color: "#f85149",
          border: "1px solid rgba(248,81,73,0.4)",
          cursor: "pointer"
        }
      },
      "\u{1F5D1}\uFE0F Delete Job"
    ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 6px 0", fontSize: 14, fontWeight: 800, color: textMain } }, "About the Role"), /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: 13, color: textMuted, lineHeight: 1.6 } }, selectedJob.description)), selectedJob.requirements && selectedJob.requirements.length > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 6px 0", fontSize: 14, fontWeight: 800, color: textMain } }, "Requirements"), /* @__PURE__ */ React.createElement("ul", { style: { margin: 0, paddingLeft: 20, fontSize: 13, color: textMuted, lineHeight: 1.6 } }, selectedJob.requirements.map((req, rIdx) => /* @__PURE__ */ React.createElement("li", { key: rIdx }, req)))), selectedJob.skills && selectedJob.skills.length > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 6px 0", fontSize: 14, fontWeight: 800, color: textMain } }, "Required Skills"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" } }, selectedJob.skills.map((sk, sIdx) => /* @__PURE__ */ React.createElement("span", { key: sIdx, style: { fontSize: 11, padding: "2px 8px", borderRadius: 6, background: isDark ? "#21262d" : "#f1f5f9", color: textMain, border: "1px solid " + cardBorder } }, sk)))), isAdmin ? /* @__PURE__ */ React.createElement("div", { style: { borderTop: "1px solid " + cardBorder, paddingTop: 14 } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: "0 0 10px 0", fontSize: 15, fontWeight: 800, color: textMain } }, "\u{1F465} Candidates Applied to this Role (", selectedJobApplicants.length, ")"), selectedJobApplicants.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: {
      padding: 20,
      borderRadius: 10,
      background: isDark ? "#0d1117" : "#f8fafc",
      border: "1px solid " + cardBorder,
      textAlign: "center",
      color: textMuted,
      fontSize: 13
    } }, "No developers have submitted applications for this role yet.") : /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } }, selectedJobApplicants.map((app) => {
      const st = statusBadgeColors[app.status] || statusBadgeColors.applied;
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: app.id,
          style: {
            padding: 14,
            borderRadius: 10,
            background: isDark ? "#0d1117" : "#f8fafc",
            border: "1px solid " + cardBorder,
            display: "flex",
            flexDirection: "column",
            gap: 8
          }
        },
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("strong", { style: { fontSize: 14, color: textMain } }, app.user_name || "Candidate"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: textMuted, marginLeft: 8 } }, "(", app.user_email, ")")), /* @__PURE__ */ React.createElement(
          "select",
          {
            value: app.status,
            onChange: (e) => handleUpdateApplicantStatus(app.id, e.target.value),
            style: {
              padding: "4px 10px",
              borderRadius: 8,
              border: "1px solid " + st.border,
              background: st.bg,
              color: st.text,
              fontSize: 11,
              fontWeight: 800,
              cursor: "pointer"
            }
          },
          /* @__PURE__ */ React.createElement("option", { value: "applied" }, "APPLIED"),
          /* @__PURE__ */ React.createElement("option", { value: "under_review" }, "UNDER REVIEW"),
          /* @__PURE__ */ React.createElement("option", { value: "interviewing" }, "INTERVIEWING"),
          /* @__PURE__ */ React.createElement("option", { value: "accepted" }, "ACCEPTED"),
          /* @__PURE__ */ React.createElement("option", { value: "rejected" }, "REJECTED")
        )),
        app.cover_note && /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: 12, color: textMuted, fontStyle: "italic" } }, '"', app.cover_note, '"'),
        /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 14, fontSize: 11, color: textMuted } }, app.portfolio_url && /* @__PURE__ */ React.createElement("a", { href: app.portfolio_url, target: "_blank", rel: "noreferrer", style: { color: "#58a6ff", textDecoration: "none" } }, "\u{1F517} ", app.portfolio_url), app.resume_summary && /* @__PURE__ */ React.createElement("span", null, "\u{1F4C4} ", app.resume_summary))
      );
    })), /* @__PURE__ */ React.createElement("div", { style: {
      marginTop: 14,
      padding: 10,
      borderRadius: 8,
      background: isDark ? "rgba(210,168,255,0.08)" : "#f5f0ff",
      color: "#d2a8ff",
      fontSize: 12,
      fontWeight: 700,
      textAlign: "center"
    } }, "\u{1F6E1}\uFE0F Administrator Recruiter Mode: Admins manage postings and candidate reviews. Application submission is reserved for developer accounts.")) : appliedJobIds.has(selectedJob.id) ? /* @__PURE__ */ React.createElement("div", { style: {
      padding: 14,
      borderRadius: 10,
      background: "rgba(63,185,80,0.12)",
      border: "1px solid rgba(63,185,80,0.4)",
      color: "#3fb950",
      fontWeight: 700,
      fontSize: 13,
      textAlign: "center"
    } }, "\u2713 You have already submitted an application for this position.") : user ? /* @__PURE__ */ React.createElement("form", { onSubmit: handleApply, style: { display: "flex", flexDirection: "column", gap: 12, borderTop: "1px solid " + cardBorder, paddingTop: 14 } }, /* @__PURE__ */ React.createElement("h4", { style: { margin: 0, fontSize: 14, fontWeight: 800, color: textMain } }, "Submit Your Application"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: 700, color: textMuted, display: "block", marginBottom: 4 } }, "Cover Note / Pitch"), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        rows: 3,
        value: coverNote,
        onChange: (e) => setCoverNote(e.target.value),
        placeholder: "Explain why your experience with this tech stack makes you an exceptional match...",
        style: { width: "100%", padding: 10, borderRadius: 8, border: "1px solid " + cardBorder, background: inputBg, color: textMain, fontSize: 13, outline: "none" }
      }
    )), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: 700, color: textMuted, display: "block", marginBottom: 4 } }, "Portfolio / GitHub URL"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "url",
        value: portfolioUrl,
        onChange: (e) => setPortfolioUrl(e.target.value),
        placeholder: "https://github.com/yourhandle",
        style: { width: "100%", padding: 9, borderRadius: 8, border: "1px solid " + cardBorder, background: inputBg, color: textMain, fontSize: 13, outline: "none" }
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: 700, color: textMuted, display: "block", marginBottom: 4 } }, "Resume Summary (Optional)"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: resumeSummary,
        onChange: (e) => setResumeSummary(e.target.value),
        placeholder: "5 yrs Fullstack, React, Node.js...",
        style: { width: "100%", padding: 9, borderRadius: 8, border: "1px solid " + cardBorder, background: inputBg, color: textMain, fontSize: 13, outline: "none" }
      }
    ))), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "submit",
        disabled: applying,
        style: {
          marginTop: 6,
          padding: "12px",
          borderRadius: 10,
          background: "linear-gradient(135deg, #238636, #2ea043)",
          color: "#ffffff",
          fontWeight: 800,
          fontSize: 14,
          border: "none",
          cursor: applying ? "not-allowed" : "pointer"
        }
      },
      applying ? "Submitting Application..." : "\u{1F680} Submit Application Now"
    )) : /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: 16, background: isDark ? "#21262d" : "#f1f5f9", borderRadius: 10, border: "1px solid " + cardBorder } }, /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 10px 0", fontSize: 13, color: textMain } }, "Please sign in to apply for this engineering role.")))), isCreateJobOpen && isAdmin && /* @__PURE__ */ React.createElement(Modal, { onClose: () => setIsCreateJobOpen(false), title: "Post a New Job Opportunity (Admin)" }, /* @__PURE__ */ React.createElement("form", { onSubmit: handleCreateJob, style: { display: "flex", flexDirection: "column", gap: 12, maxHeight: "70vh", overflowY: "auto", paddingRight: 4 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: 700, color: textMuted, display: "block", marginBottom: 4 } }, "Job Title *"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        required: true,
        value: newTitle,
        onChange: (e) => setNewTitle(e.target.value),
        placeholder: "e.g. Senior Full Stack Engineer",
        style: { width: "100%", padding: 9, borderRadius: 8, border: "1px solid " + cardBorder, background: inputBg, color: textMain, fontSize: 13, outline: "none" }
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: 700, color: textMuted, display: "block", marginBottom: 4 } }, "Company Name *"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        required: true,
        value: newCompany,
        onChange: (e) => setNewCompany(e.target.value),
        placeholder: "e.g. Acme Tech",
        style: { width: "100%", padding: 9, borderRadius: 8, border: "1px solid " + cardBorder, background: inputBg, color: textMain, fontSize: 13, outline: "none" }
      }
    ))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: 700, color: textMuted, display: "block", marginBottom: 4 } }, "Primary Role Category"), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: newRole,
        onChange: (e) => setNewRole(e.target.value),
        style: { width: "100%", padding: 9, borderRadius: 8, border: "1px solid " + cardBorder, background: inputBg, color: textMain, fontSize: 13 }
      },
      rolesList.filter((r) => r !== "All Roles").map((r) => /* @__PURE__ */ React.createElement("option", { key: r, value: r }, r))
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: 700, color: textMuted, display: "block", marginBottom: 4 } }, "Employment Type"), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: newType,
        onChange: (e) => setNewType(e.target.value),
        style: { width: "100%", padding: 9, borderRadius: 8, border: "1px solid " + cardBorder, background: inputBg, color: textMain, fontSize: 13 }
      },
      typesList.filter((t) => t !== "All Types").map((t) => /* @__PURE__ */ React.createElement("option", { key: t, value: t }, t))
    ))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: 700, color: textMuted, display: "block", marginBottom: 4 } }, "Experience Level"), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: newExp,
        onChange: (e) => setNewExp(e.target.value),
        style: { width: "100%", padding: 9, borderRadius: 8, border: "1px solid " + cardBorder, background: inputBg, color: textMain, fontSize: 13 }
      },
      expList.filter((e) => e !== "All Levels").map((e) => /* @__PURE__ */ React.createElement("option", { key: e, value: e }, e))
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: 700, color: textMuted, display: "block", marginBottom: 4 } }, "Salary Range"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: newSalary,
        onChange: (e) => setNewSalary(e.target.value),
        placeholder: "e.g. $120k - $150k / yr",
        style: { width: "100%", padding: 9, borderRadius: 8, border: "1px solid " + cardBorder, background: inputBg, color: textMain, fontSize: 13, outline: "none" }
      }
    ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: 700, color: textMuted, display: "block", marginBottom: 4 } }, "Location"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: newLocation,
        onChange: (e) => setNewLocation(e.target.value),
        placeholder: "e.g. Remote, San Francisco, CA",
        style: { width: "100%", padding: 9, borderRadius: 8, border: "1px solid " + cardBorder, background: inputBg, color: textMain, fontSize: 13, outline: "none" }
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: 700, color: textMuted, display: "block", marginBottom: 4 } }, "Job Description *"), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        rows: 3,
        required: true,
        value: newDesc,
        onChange: (e) => setNewDesc(e.target.value),
        placeholder: "Describe the mission, responsibilities, and team culture...",
        style: { width: "100%", padding: 9, borderRadius: 8, border: "1px solid " + cardBorder, background: inputBg, color: textMain, fontSize: 13, outline: "none" }
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: 700, color: textMuted, display: "block", marginBottom: 4 } }, "Requirements (one per line)"), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        rows: 2,
        value: newReqs,
        onChange: (e) => setNewReqs(e.target.value),
        placeholder: "3+ years in React\nExperience with MongoDB\nGit workflows",
        style: { width: "100%", padding: 9, borderRadius: 8, border: "1px solid " + cardBorder, background: inputBg, color: textMain, fontSize: 13, outline: "none" }
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: 700, color: textMuted, display: "block", marginBottom: 4 } }, "Skills (comma-separated)"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: newSkills,
        onChange: (e) => setNewSkills(e.target.value),
        placeholder: "React, Node.js, Express, MongoDB, Docker",
        style: { width: "100%", padding: 9, borderRadius: 8, border: "1px solid " + cardBorder, background: inputBg, color: textMain, fontSize: 13, outline: "none" }
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: 700, color: textMuted } }, "Job Banner Image (Stored Locally in Folder & Database)"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: "#3fb950", fontWeight: 700 } }, "\u{1F4C1} Local Storage")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: newImageUrl,
        onChange: (e) => setNewImageUrl(e.target.value),
        placeholder: "Local path (/uploads/jobs/...) or external URL to auto-download...",
        style: { flex: 1, padding: 9, borderRadius: 8, border: "1px solid " + cardBorder, background: inputBg, color: textMain, fontSize: 13, outline: "none" }
      }
    ), /* @__PURE__ */ React.createElement("label", { style: {
      padding: "8px 12px",
      borderRadius: 8,
      border: "1px solid " + cardBorder,
      background: isDark ? "#21262d" : "#f1f5f9",
      color: textMain,
      cursor: uploadingJobImage ? "wait" : "pointer",
      fontSize: 12,
      fontWeight: 700,
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      whiteSpace: "nowrap"
    } }, uploadingJobImage ? "Uploading..." : "\u{1F4C1} Upload File", /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "file",
        accept: "image/*",
        style: { display: "none" },
        disabled: uploadingJobImage,
        onChange: handleJobImageUpload
      }
    )), newImageUrl && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setNewImageUrl(""),
        style: { padding: "8px 12px", borderRadius: 8, border: "1px solid " + cardBorder, background: "transparent", color: textMuted, cursor: "pointer", fontSize: 12 }
      },
      "Clear"
    )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8, alignItems: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: textMuted, fontWeight: 700 } }, "Quick Local Presets:"), Object.keys(ROLE_DEFAULT_IMAGES).map((roleKey) => /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        key: roleKey,
        onClick: () => setNewImageUrl(ROLE_DEFAULT_IMAGES[roleKey]),
        style: {
          padding: "3px 8px",
          borderRadius: 6,
          fontSize: 10,
          fontWeight: 700,
          background: newImageUrl === ROLE_DEFAULT_IMAGES[roleKey] ? "#1f6feb" : isDark ? "#21262d" : "#f1f5f9",
          color: newImageUrl === ROLE_DEFAULT_IMAGES[roleKey] ? "#ffffff" : textMuted,
          border: "1px solid " + (newImageUrl === ROLE_DEFAULT_IMAGES[roleKey] ? "#1f6feb" : cardBorder),
          cursor: "pointer"
        }
      },
      roleKey
    ))), newImageUrl && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 8, borderRadius: 8, overflow: "hidden", height: 90, border: "1px solid " + cardBorder, position: "relative" } }, /* @__PURE__ */ React.createElement(
      "img",
      {
        src: newImageUrl,
        alt: "Preview",
        onError: (e) => {
          e.currentTarget.style.display = "none";
        },
        style: { width: "100%", height: "100%", objectFit: "cover" }
      }
    ), /* @__PURE__ */ React.createElement("span", { style: {
      position: "absolute",
      top: 6,
      right: 6,
      fontSize: 10,
      fontWeight: 800,
      padding: "2px 6px",
      borderRadius: 6,
      background: "rgba(0,0,0,0.7)",
      color: "#ffffff"
    } }, "Image Preview"))), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "submit",
        disabled: creatingJob,
        style: {
          marginTop: 8,
          padding: "12px",
          borderRadius: 10,
          background: "linear-gradient(135deg, #238636, #2ea043)",
          color: "#ffffff",
          fontWeight: 800,
          fontSize: 14,
          border: "none",
          cursor: creatingJob ? "not-allowed" : "pointer"
        }
      },
      creatingJob ? "Publishing..." : "\u2728 Publish Job Opportunity"
    ))));
  }
  function ReposView({ user, repositories = [], onSelectRepo, onOpenCreateRepo, showNotify, theme }) {
    const isDark = theme !== "light";
    const cardBg = isDark ? "#161b22" : "#ffffff";
    const cardBorder = isDark ? "#30363d" : "#d0d7de";
    const textMain = isDark ? "#e6edf3" : "#1f2328";
    const textMuted = isDark ? "#8b949e" : "#57606a";
    const inputBg = isDark ? "#0d1117" : "#ffffff";
    const shadow = isDark ? "0 8px 24px rgba(0,0,0,0.3)" : "0 1px 3px rgba(31, 35, 40, 0.08)";
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");
    const isAdmin = Boolean(user && (user.role === "admin" || user.role_type === "admin"));
    const userRepos = user ? repositories.filter((r) => r.user_id == user.id) : [];
    const publicRepos = repositories.filter((r) => r.visibility === "public");
    const baseRepos = isAdmin ? repositories : user ? userRepos : publicRepos;
    const displayed = baseRepos.filter((r) => filter === "all" || r.visibility === filter).filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));
    const handleToggleVisibility = async (e, repo) => {
      e.stopPropagation();
      const newVis = repo.visibility === "public" ? "private" : "public";
      try {
        await apiCall(`/repositories/${repo.id}/visibility`, "PUT", { visibility: newVis });
        if (showNotify) showNotify(`Repository '${repo.name}' is now ${newVis.toUpperCase()}!`);
        window.dispatchEvent(new CustomEvent("refreshRepos"));
      } catch (err) {
        if (showNotify) showNotify(err.message, "error");
      }
    };
    const handleDeleteRepo = async (e, repo) => {
      e.stopPropagation();
      if (!window.confirm(`Are you sure you want to permanently delete repository '${repo.name}' and all its files?`)) return;
      try {
        await apiCall(`/repositories/${repo.id}`, "DELETE");
        if (showNotify) showNotify(`Repository '${repo.name}' deleted.`);
        window.dispatchEvent(new CustomEvent("refreshRepos"));
      } catch (err) {
        if (showNotify) showNotify(err.message, "error");
      }
    };
    return /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 1360, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: 24 } }, /* @__PURE__ */ React.createElement("style", null, `
                .codehub-jobs-grid {
                    display: grid;
                    grid-template-columns: repeat(4, minmax(0, 1fr));
                    gap: 16px;
                }
                @media (max-width: 1200px) {
                    .codehub-jobs-grid {
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                    }
                }
                @media (max-width: 860px) {
                    .codehub-jobs-grid {
                        grid-template-columns: repeat(2, minmax(0, 1fr));
                    }
                }
                @media (max-width: 560px) {
                    .codehub-jobs-grid {
                        grid-template-columns: 1fr;
                    }
                }
                .codehub-job-card {
                    transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
                }
                .codehub-job-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 24px rgba(0,0,0,0.12) !important;
                }
                .codehub-job-card:hover .codehub-job-img {
                    transform: scale(1.04);
                }
            `), /* @__PURE__ */ React.createElement("div", { style: {
      background: isDark ? isAdmin ? "linear-gradient(135deg, #1f1035, #161b22)" : "linear-gradient(135deg, #0d1f47, #161b22)" : isAdmin ? "linear-gradient(135deg, #f5f0ff, #f0fdf4)" : "linear-gradient(135deg, #e0f2fe, #f0fdf4)",
      border: "1px solid " + (isAdmin ? isDark ? "rgba(210,168,255,0.4)" : "#e9d5ff" : isDark ? cardBorder : "#bae6fd"),
      borderRadius: 16,
      padding: "28px 32px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 16,
      boxShadow: shadow
    } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 28 } }, isAdmin ? "\u{1F6E1}\uFE0F" : "\u{1F4C1}"), /* @__PURE__ */ React.createElement("h1", { style: { margin: 0, fontSize: 24, fontWeight: 900, color: textMain } }, isAdmin ? "Platform Repositories Management (Admin)" : user ? "My Repositories" : "Explore Public Repositories")), /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: 14, color: textMuted, maxWidth: 680, lineHeight: 1.5 } }, isAdmin ? "Administrator Console: Manage all code repositories across the ecosystem. Moderate visibility and remove repositories. Admins do not create repos." : "Personal and open-source software repositories linked live to Google Drive storage.")), !isAdmin && user && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: onOpenCreateRepo,
        disabled: !user.is_verified,
        style: {
          padding: "11px 22px",
          borderRadius: 14,
          fontWeight: 800,
          fontSize: 13,
          background: user.is_verified ? "linear-gradient(135deg, #238636, #2ea043)" : isDark ? "#21262d" : "#e2e8f0",
          color: user.is_verified ? "#fff" : textMuted,
          border: "none",
          cursor: user.is_verified ? "pointer" : "not-allowed",
          boxShadow: user.is_verified ? "0 4px 14px rgba(35,134,54,0.35)" : "none"
        }
      },
      "+ New Repository"
    )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        value: search,
        onChange: (e) => setSearch(e.target.value),
        placeholder: "Search repositories by name...",
        style: {
          flex: 1,
          minWidth: 220,
          padding: "10px 16px",
          borderRadius: 12,
          border: `1px solid ${cardBorder}`,
          background: inputBg,
          color: textMain,
          fontSize: 13,
          boxShadow: isDark ? "none" : "0 1px 2px rgba(31,35,40,0.04)"
        }
      }
    ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, ["all", "public", "private"].map((f) => {
      const active = filter === f;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: f,
          onClick: () => setFilter(f),
          style: {
            padding: "8px 18px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700,
            textTransform: "capitalize",
            background: active ? isDark ? "#1f6feb" : "#e0f2fe" : isDark ? "#21262d" : "#ffffff",
            color: active ? isDark ? "#fff" : "#0969da" : textMuted,
            border: active ? isDark ? "none" : "1px solid #bae6fd" : isDark ? "1px solid #30363d" : "1px solid #d0d7de",
            cursor: "pointer",
            boxShadow: isDark ? "none" : "0 1px 2px rgba(31,35,40,0.04)"
          }
        },
        f
      );
    }))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 18 } }, displayed.map((repo) => {
      const isPub = repo.visibility === "public";
      const badgeBg = isPub ? isDark ? "rgba(63,185,80,0.15)" : "#dcfce7" : isDark ? "rgba(210,168,255,0.15)" : "#f3e8ff";
      const badgeText = isPub ? isDark ? "#3fb950" : "#15803d" : isDark ? "#d2a8ff" : "#7c3aed";
      const badgeBorder = isPub ? isDark ? "rgba(63,185,80,0.3)" : "#bbf7d0" : isDark ? "rgba(210,168,255,0.3)" : "#e9d5ff";
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: repo.id,
          onClick: () => onSelectRepo(repo.id),
          style: {
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: 16,
            padding: "22px 20px",
            cursor: "pointer",
            transition: "all 0.2s",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: 14,
            boxShadow: shadow
          },
          onMouseEnter: (e) => {
            e.currentTarget.style.borderColor = "#0969da";
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = isDark ? "0 12px 28px rgba(0,0,0,0.45)" : "0 6px 18px rgba(9,105,218,0.12)";
          },
          onMouseLeave: (e) => {
            e.currentTarget.style.borderColor = cardBorder;
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = shadow;
          }
        },
        /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10, gap: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 800, fontSize: 16, color: isDark ? "#58a6ff" : "#0969da" } }, "\u{1F4E6} ", repo.name), /* @__PURE__ */ React.createElement("span", { style: {
          fontSize: 10,
          padding: "3px 10px",
          borderRadius: 20,
          fontWeight: 800,
          textTransform: "uppercase",
          background: badgeBg,
          color: badgeText,
          border: `1px solid ${badgeBorder}`
        } }, repo.visibility)), repo.owner_name && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: textMuted, marginBottom: 8 } }, "\u{1F464} Owner: ", /* @__PURE__ */ React.createElement("strong", { style: { color: textMain } }, "@", repo.owner_name)), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 13, color: textMuted, margin: "0 0 10px", lineHeight: 1.5 } }, repo.description || "No description provided.")),
        /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: {
          display: "flex",
          justifyContent: "space-between",
          fontSize: 12,
          color: textMuted,
          borderTop: `1px solid ${isDark ? "#21262d" : "#f0f2f5"}`,
          paddingTop: 12,
          marginBottom: isAdmin ? 12 : 0
        } }, /* @__PURE__ */ React.createElement("span", null, "\u{1F33F} ", repo.branch_count || 1, " branches"), /* @__PURE__ */ React.createElement("span", null, "\u{1F4E6} ", repo.commit_count || 1, " commits"), /* @__PURE__ */ React.createElement("span", { style: { color: isDark ? "#58a6ff" : "#0969da", fontWeight: 600 } }, "\u2601\uFE0F Drive")), isAdmin && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, borderTop: `1px solid ${isDark ? "#21262d" : "#f0f2f5"}`, paddingTop: 10 } }, /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: (e) => handleToggleVisibility(e, repo),
            title: "Toggle Public / Private",
            style: {
              flex: 1,
              padding: "7px 12px",
              borderRadius: 8,
              background: isDark ? "#21262d" : "#f6f8fa",
              border: `1px solid ${cardBorder}`,
              color: textMain,
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer"
            }
          },
          repo.visibility === "public" ? "\u{1F512} Make Private" : "\u{1F310} Make Public"
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            onClick: (e) => handleDeleteRepo(e, repo),
            title: "Delete Repository",
            style: {
              padding: "7px 14px",
              borderRadius: 8,
              background: isDark ? "rgba(248,81,73,0.12)" : "#fee2e2",
              border: `1px solid ${isDark ? "rgba(248,81,73,0.3)" : "#fecaca"}`,
              color: isDark ? "#f85149" : "#b91c1c",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer"
            }
          },
          "\u{1F5D1}\uFE0F Delete"
        )))
      );
    }), displayed.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { gridColumn: "1/-1", textAlign: "center", padding: 60, color: textMuted, background: cardBg, borderRadius: 16, border: `1px solid ${cardBorder}` } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 40, marginBottom: 12 } }, "\u{1F4ED}"), /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: 15, fontWeight: 600, color: textMain } }, "No repositories found", search ? ` matching "${search}"` : "", "."), user && user.is_verified && !isAdmin && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: onOpenCreateRepo,
        style: {
          marginTop: 14,
          padding: "8px 18px",
          borderRadius: 10,
          background: isDark ? "#21262d" : "#e0f2fe",
          border: `1px solid ${isDark ? "#30363d" : "#bae6fd"}`,
          color: isDark ? "#58a6ff" : "#0969da",
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer"
        }
      },
      "Create your first repository \u2192"
    ))));
  }
  function SettingsView({ user, repositories = [], onSelectRepo, onOpenCreateRepo, showNotify, onOpenDeleteAccount, onUserUpdated, theme }) {
    if (!user) return /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: 60, color: "#8b949e" } }, "Please sign in to access profile and settings.");
    const isDark = theme !== "light";
    const [activeTab, setActiveTab] = useState("overview");
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [settingsData, setSettingsData] = useState(null);
    const fileInputRef = useRef(null);
    const [repoSearch, setRepoSearch] = useState("");
    const [repoTypeFilter, setRepoTypeFilter] = useState("all");
    const [profileForm, setProfileForm] = useState({
      full_name: user.full_name || "",
      username: user.username || (user.email ? user.email.split("@")[0] : ""),
      pronouns: user.pronouns || "",
      bio: user.bio || "",
      organization: user.organization || "",
      location: user.location || "",
      website_url: user.website_url || "",
      social_instagram: user.social_instagram || "",
      social_email: user.social_email || user.email || "",
      social_linkedin: user.social_linkedin || "",
      social_github: user.social_github || "",
      readme_content: user.readme_content || "",
      tech_stack: Array.isArray(user.tech_stack) ? user.tech_stack : []
    });
    const [preferences, setPreferences] = useState({
      two_factor_enabled: false,
      email_notifications: true,
      security_alerts: true,
      code_review_notifications: true,
      theme_preference: "system"
    });
    const [passwordForm, setPasswordForm] = useState({
      current_password: "",
      new_password: "",
      confirm_password: ""
    });
    const [changingPassword, setChangingPassword] = useState(false);
    const [tokens, setTokens] = useState([]);
    const [newTokenName, setNewTokenName] = useState("");
    const [generatedToken, setGeneratedToken] = useState(null);
    const [creatingToken, setCreatingToken] = useState(false);
    const TECH_STACK_COLORS = {
      "C": { bg: "#00599c", text: "#ffffff" },
      "C++": { bg: "#004482", text: "#ffffff" },
      "CSS3": { bg: "#1572b6", text: "#ffffff" },
      "JAVA": { bg: "#e76f00", text: "#ffffff" },
      "HTML5": { bg: "#e34f26", text: "#ffffff" },
      "JAVASCRIPT": { bg: "#f7df1e", text: "#000000" },
      "PYTHON": { bg: "#3776ab", text: "#ffffff" },
      "TYPESCRIPT": { bg: "#3178c6", text: "#ffffff" },
      "BASH SCRIPT": { bg: "#293134", text: "#ffffff" },
      "WINDOWS TERMINAL": { bg: "#4d4d4d", text: "#ffffff" },
      "POWERSHELL": { bg: "#012456", text: "#ffffff" },
      "ORACLE": { bg: "#f80000", text: "#ffffff" },
      "FIREBASE": { bg: "#ffca28", text: "#000000" },
      "GOOGLECLOUD": { bg: "#4285f4", text: "#ffffff" },
      "AWS": { bg: "#ff9900", text: "#000000" },
      ".NET": { bg: "#512bd4", text: "#ffffff" },
      "ANACONDA": { bg: "#44a833", text: "#ffffff" },
      "ANGULAR": { bg: "#dd0031", text: "#ffffff" },
      "ANGULAR.JS": { bg: "#e23237", text: "#ffffff" },
      "BOOTSTRAP": { bg: "#7952b3", text: "#ffffff" },
      "JQUERY": { bg: "#0769ad", text: "#ffffff" },
      "NODE.JS": { bg: "#339933", text: "#ffffff" },
      "REACT NATIVE": { bg: "#61dafb", text: "#000000" },
      "REACT": { bg: "#61dafb", text: "#000000" },
      "MYSQL": { bg: "#4479a1", text: "#ffffff" },
      "SQLITE": { bg: "#003b57", text: "#ffffff" },
      "MONGODB": { bg: "#47a248", text: "#ffffff" },
      "MARIADB": { bg: "#003545", text: "#ffffff" },
      "CANVA": { bg: "#00c4cc", text: "#000000" },
      "ADOBE ACROBAT READER": { bg: "#ff0000", text: "#ffffff" },
      "NUMPY": { bg: "#013243", text: "#ffffff" },
      "PANDAS": { bg: "#150458", text: "#ffffff" },
      "TENSORFLOW": { bg: "#ff6f00", text: "#ffffff" },
      "PYTORCH": { bg: "#ee4c2c", text: "#ffffff" },
      "SCIKIT-LEARN": { bg: "#f7931e", text: "#ffffff" },
      "MATPLOTLIB": { bg: "#11557c", text: "#ffffff" },
      "KERAS": { bg: "#d00000", text: "#ffffff" },
      "GIT": { bg: "#f05032", text: "#ffffff" },
      "GITHUB": { bg: "#181717", text: "#ffffff" },
      "UNITY": { bg: "#222c37", text: "#ffffff" },
      "UBISOFT": { bg: "#000000", text: "#ffffff" },
      "STEAM": { bg: "#171a21", text: "#ffffff" },
      "UNREALENGINE": { bg: "#0e1128", text: "#ffffff" },
      "XBOX": { bg: "#107c10", text: "#ffffff" },
      "GODOT": { bg: "#478cbf", text: "#ffffff" }
    };
    const loadSettings = async () => {
      try {
        const data = await apiCall("/settings");
        if (data.user) {
          setSettingsData(data);
          setProfileForm({
            full_name: data.user.full_name || "",
            username: data.user.username || (data.user.email ? data.user.email.split("@")[0] : ""),
            pronouns: data.user.pronouns || "",
            bio: data.user.bio || "",
            organization: data.user.organization || "",
            location: data.user.location || "",
            website_url: data.user.website_url || "",
            social_instagram: data.user.social_instagram || "",
            social_email: data.user.social_email || data.user.email || "",
            social_linkedin: data.user.social_linkedin || "",
            social_github: data.user.social_github || "",
            readme_content: data.user.readme_content || "",
            tech_stack: Array.isArray(data.user.tech_stack) ? data.user.tech_stack : []
          });
          setPreferences({
            two_factor_enabled: Boolean(data.user.two_factor_enabled),
            email_notifications: data.user.email_notifications !== false,
            security_alerts: data.user.security_alerts !== false,
            code_review_notifications: data.user.code_review_notifications !== false,
            theme_preference: data.user.theme_preference || "system"
          });
        }
      } catch (err) {
        console.error(err);
      }
    };
    const loadTokens = async () => {
      try {
        const data = await apiCall("/settings/tokens");
        setTokens(data.tokens || []);
      } catch (err) {
        console.error(err);
      }
    };
    useEffect(() => {
      loadSettings();
      loadTokens();
    }, []);
    const handleAvatarFile = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        showNotify("Image must be under 5MB", "error");
        return;
      }
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const dataUrl = evt.target.result;
        setUploading(true);
        try {
          const res = await apiCall("/settings", "PUT", { avatar_url: dataUrl });
          localStorage.setItem("codehub_user", JSON.stringify(res.user));
          if (onUserUpdated) onUserUpdated(res.user);
          showNotify("Profile picture updated successfully! \u{1F4F8}");
          loadSettings();
        } catch (err) {
          showNotify(err.message, "error");
        } finally {
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    };
    const handleSaveProfile = async (e) => {
      if (e) e.preventDefault();
      setSaving(true);
      try {
        const res = await apiCall("/settings", "PUT", {
          ...profileForm,
          ...preferences
        });
        localStorage.setItem("codehub_user", JSON.stringify(res.user));
        if (onUserUpdated) onUserUpdated(res.user);
        showNotify("GitHub profile, bio & tech stack updated! \u2705");
        loadSettings();
        setActiveTab("overview");
      } catch (err) {
        showNotify(err.message, "error");
      } finally {
        setSaving(false);
      }
    };
    const handleChangePassword = async (e) => {
      e.preventDefault();
      if (passwordForm.new_password.length < 6) {
        showNotify("New password must be at least 6 characters.", "error");
        return;
      }
      if (passwordForm.new_password !== passwordForm.confirm_password) {
        showNotify("New passwords do not match.", "error");
        return;
      }
      setChangingPassword(true);
      try {
        await apiCall("/settings/password", "POST", passwordForm);
        showNotify("Password updated securely! \u{1F512}");
        setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
      } catch (err) {
        showNotify(err.message, "error");
      } finally {
        setChangingPassword(false);
      }
    };
    const handleCreateToken = async (e) => {
      e.preventDefault();
      setCreatingToken(true);
      try {
        const res = await apiCall("/settings/tokens", "POST", { name: newTokenName.trim() });
        setGeneratedToken(res.token);
        setNewTokenName("");
        loadTokens();
        showNotify("Personal access token generated! \u{1F511}");
      } catch (err) {
        showNotify(err.message, "error");
      } finally {
        setCreatingToken(false);
      }
    };
    const handleDeleteToken = async (id) => {
      try {
        await apiCall("/settings/tokens/" + id, "DELETE");
        showNotify("Token revoked.");
        loadTokens();
      } catch (err) {
        showNotify(err.message, "error");
      }
    };
    const cardBg = isDark ? "#161b22" : "#ffffff";
    const cardBorder = isDark ? "#30363d" : "#d0d7de";
    const textMain = isDark ? "#e6edf3" : "#1f2328";
    const textMuted = isDark ? "#8b949e" : "#57606a";
    const inputBg = isDark ? "#0d1117" : "#ffffff";
    const inputStyle = {
      width: "100%",
      boxSizing: "border-box",
      padding: "10px 14px",
      borderRadius: 10,
      border: "1px solid " + cardBorder,
      background: inputBg,
      color: textMain,
      fontSize: 13,
      outline: "none"
    };
    const isAdmin = user.role === "admin" || user.role_type === "admin";
    const userRepos = isAdmin ? repositories : repositories.filter((r) => r.user_id == user.id);
    const filteredRepos = userRepos.filter((r) => {
      const matchesSearch = r.name.toLowerCase().includes(repoSearch.toLowerCase());
      const matchesType = repoTypeFilter === "all" || r.visibility === repoTypeFilter;
      return matchesSearch && matchesType;
    });
    const activeTechStack = Array.isArray(profileForm.tech_stack) ? profileForm.tech_stack : [];
    return /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 1200, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: 20 } }, /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      borderBottom: "1px solid " + cardBorder,
      paddingBottom: 0,
      overflowX: "auto"
    } }, [
      { id: "overview", label: "\u{1F4D6} Overview", count: null },
      { id: "repositories", label: "\u{1F4C1} Repositories", count: userRepos.length },
      { id: "edit_profile", label: "\u270F\uFE0F Edit Profile", count: null },
      { id: "security", label: "\u{1F511} Security & Tokens", count: null },
      { id: "preferences", label: "\u2699\uFE0F Preferences & Quota", count: null }
    ].map((tab) => {
      const isSelected = activeTab === tab.id;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: tab.id,
          onClick: () => setActiveTab(tab.id),
          style: {
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "10px 18px",
            background: "transparent",
            border: "none",
            borderBottom: isSelected ? "2px solid #f78166" : "2px solid transparent",
            color: isSelected ? textMain : textMuted,
            fontWeight: isSelected ? 700 : 500,
            fontSize: 14,
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "all 0.15s ease"
          }
        },
        /* @__PURE__ */ React.createElement("span", null, tab.label),
        tab.count !== null && /* @__PURE__ */ React.createElement("span", { style: {
          padding: "2px 8px",
          borderRadius: 12,
          fontSize: 11,
          fontWeight: 700,
          background: isDark ? "#21262d" : "#eaeef2",
          color: textMuted
        } }, tab.count)
      );
    })), activeTab === "overview" && /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "minmax(280px, 320px) 1fr", gap: 24, alignItems: "start" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { position: "relative", width: 280, height: 280, margin: "0 auto" } }, user.avatar_url ? /* @__PURE__ */ React.createElement(
      "img",
      {
        src: user.avatar_url,
        alt: profileForm.full_name || "Profile",
        style: {
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          objectFit: "cover",
          border: "4px solid " + (isDark ? "#21262d" : "#d0d7de"),
          boxShadow: "0 8px 30px rgba(0,0,0,0.35)"
        }
      }
    ) : /* @__PURE__ */ React.createElement("div", { style: {
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      background: "linear-gradient(135deg, #1f6feb 0%, #a371f7 50%, #f778ba 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 90,
      fontWeight: 900,
      color: "#ffffff",
      border: "4px solid " + (isDark ? "#21262d" : "#d0d7de"),
      boxShadow: "0 8px 30px rgba(0,0,0,0.35)"
    } }, (profileForm.full_name || profileForm.username || user.email || "U")[0].toUpperCase()), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => fileInputRef.current?.click(),
        title: "Change avatar photo",
        style: {
          position: "absolute",
          bottom: 12,
          right: 12,
          width: 38,
          height: 38,
          borderRadius: "50%",
          background: "#21262d",
          border: "2px solid #30363d",
          color: "#58a6ff",
          fontSize: 16,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.4)"
        }
      },
      "\u{1F4F7}"
    ), /* @__PURE__ */ React.createElement("input", { ref: fileInputRef, type: "file", accept: "image/*", onChange: handleAvatarFile, style: { display: "none" } })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { style: { margin: 0, fontSize: 26, fontWeight: 900, color: textMain, lineHeight: 1.2 } }, profileForm.full_name || profileForm.username || (user.email ? user.email.split("@")[0] : "Developer")), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 16, color: textMuted, marginTop: 4 } }, /* @__PURE__ */ React.createElement("span", null, profileForm.username ? `@${profileForm.username}` : user.email ? `@${user.email.split("@")[0]}` : ""), profileForm.pronouns && /* @__PURE__ */ React.createElement("span", { style: { marginLeft: 6, fontSize: 14 } }, "\xB7 ", profileForm.pronouns))), profileForm.bio ? /* @__PURE__ */ React.createElement("div", { style: { fontSize: 14, color: textMain, lineHeight: 1.5 } }, profileForm.bio) : null, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setActiveTab("edit_profile"),
        style: {
          width: "100%",
          padding: "9px 16px",
          borderRadius: 8,
          background: isDark ? "#21262d" : "#f6f8fa",
          border: "1px solid " + cardBorder,
          color: textMain,
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer"
        }
      },
      "Edit profile"
    ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 12, fontSize: 13, color: textMuted } }, /* @__PURE__ */ React.createElement("span", null, "\u{1F465} ", /* @__PURE__ */ React.createElement("strong", null, "0"), " followers"), /* @__PURE__ */ React.createElement("span", null, "\xB7"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", null, "1"), " following")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8, fontSize: 13, color: textMuted } }, profileForm.location && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("span", null, "\u{1F4CD}"), /* @__PURE__ */ React.createElement("span", null, profileForm.location)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("span", null, "\u2709\uFE0F"), /* @__PURE__ */ React.createElement("span", null, profileForm.social_email || user.email)), user.role === "admin" && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginTop: 4 } }, /* @__PURE__ */ React.createElement("span", { style: {
      padding: "3px 10px",
      borderRadius: 12,
      background: "rgba(210,168,255,0.15)",
      color: "#d2a8ff",
      border: "1px solid rgba(210,168,255,0.4)",
      fontSize: 11,
      fontWeight: 800,
      textTransform: "uppercase"
    } }, "\u{1F6E1}\uFE0F Platform Administrator")))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 20 } }, /* @__PURE__ */ React.createElement("div", { style: {
      background: cardBg,
      border: "1px solid " + cardBorder,
      borderRadius: 12,
      overflow: "hidden",
      boxShadow: isDark ? "0 4px 20px rgba(0,0,0,0.25)" : "0 2px 10px rgba(0,0,0,0.04)"
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      padding: "12px 20px",
      borderBottom: "1px solid " + cardBorder,
      display: "flex",
      justifySelf: "stretch",
      justifyContent: "space-between",
      alignItems: "center",
      background: isDark ? "#0d1117" : "#f6f8fa"
    } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, fontFamily: "monospace", color: textMuted, fontWeight: 700 } }, profileForm.username || (user.email ? user.email.split("@")[0] : "user"), " / README.md"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setActiveTab("edit_profile"),
        title: "Edit README",
        style: { background: "transparent", border: "none", color: textMuted, cursor: "pointer", fontSize: 14 }
      },
      "\u270F\uFE0F"
    )), /* @__PURE__ */ React.createElement("div", { style: { padding: "24px 28px", display: "flex", flexDirection: "column", gap: 24 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 14 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 22 } }, "\u{1F4AB}"), /* @__PURE__ */ React.createElement("h3", { style: { margin: 0, fontSize: 20, fontWeight: 800, color: textMain } }, "About Me:")), /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      flexDirection: "column",
      gap: 10,
      fontSize: 14,
      color: textMain,
      lineHeight: 1.6
    } }, profileForm.readme_content ? /* @__PURE__ */ React.createElement("div", { style: { whiteSpace: "pre-wrap" } }, profileForm.readme_content) : /* @__PURE__ */ React.createElement("div", { style: { color: textMuted, fontSize: 13, lineHeight: 1.6, background: isDark ? "#0d1117" : "#f8fafc", padding: 16, borderRadius: 8, border: "1px dashed " + cardBorder } }, /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 6px 0", color: textMain, fontWeight: 700 } }, "\u{1F44B} Welcome to my CodeHub profile!"), /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 6px 0" } }, "Building modern software solutions and collaborating on open source projects."), /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontStyle: "italic" } }, 'Click "Edit profile" above to customize your README, add personal details, and showcase your skills.')))), (profileForm.social_instagram || profileForm.social_email || user.email || profileForm.social_linkedin || profileForm.social_github) && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 20 } }, "\u{1F310}"), /* @__PURE__ */ React.createElement("h4", { style: { margin: 0, fontSize: 17, fontWeight: 800, color: textMain } }, "Socials & Contact:")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, flexWrap: "wrap" } }, profileForm.social_instagram && /* @__PURE__ */ React.createElement(
      "a",
      {
        href: profileForm.social_instagram.startsWith("http") ? profileForm.social_instagram : `https://instagram.com/${profileForm.social_instagram}`,
        target: "_blank",
        rel: "noreferrer",
        style: {
          padding: "6px 14px",
          borderRadius: 6,
          background: "linear-gradient(135deg, #c13584, #e1306c)",
          color: "#ffffff",
          fontSize: 12,
          fontWeight: 800,
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: 6
        }
      },
      /* @__PURE__ */ React.createElement("span", null, "\u{1F4F8}"),
      " Instagram"
    ), (profileForm.social_email || user.email) && /* @__PURE__ */ React.createElement(
      "a",
      {
        href: "mailto:" + (profileForm.social_email || user.email),
        style: {
          padding: "6px 14px",
          borderRadius: 6,
          background: "#ea4335",
          color: "#ffffff",
          fontSize: 12,
          fontWeight: 800,
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: 6
        }
      },
      /* @__PURE__ */ React.createElement("span", null, "\u2709\uFE0F"),
      " Email"
    ), profileForm.social_linkedin && /* @__PURE__ */ React.createElement(
      "a",
      {
        href: profileForm.social_linkedin.startsWith("http") ? profileForm.social_linkedin : `https://${profileForm.social_linkedin}`,
        target: "_blank",
        rel: "noreferrer",
        style: {
          padding: "6px 14px",
          borderRadius: 6,
          background: "#0a66c2",
          color: "#ffffff",
          fontSize: 12,
          fontWeight: 800,
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: 6
        }
      },
      /* @__PURE__ */ React.createElement("span", null, "\u{1F4BC}"),
      " LinkedIn"
    ), profileForm.social_github && /* @__PURE__ */ React.createElement(
      "a",
      {
        href: profileForm.social_github.startsWith("http") ? profileForm.social_github : `https://${profileForm.social_github}`,
        target: "_blank",
        rel: "noreferrer",
        style: {
          padding: "6px 14px",
          borderRadius: 6,
          background: "#24292e",
          color: "#ffffff",
          fontSize: 12,
          fontWeight: 800,
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: 6
        }
      },
      /* @__PURE__ */ React.createElement("span", null, "\u{1F419}"),
      " GitHub"
    ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 14 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 22 } }, "\u{1F4BB}"), /* @__PURE__ */ React.createElement("h4", { style: { margin: 0, fontSize: 17, fontWeight: 800, color: textMain } }, "Tech Stack:")), activeTechStack.length > 0 ? /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 8 } }, activeTechStack.map((tech) => {
      const styling = TECH_STACK_COLORS[tech] || { bg: "#21262d", text: "#ffffff" };
      return /* @__PURE__ */ React.createElement(
        "span",
        {
          key: tech,
          style: {
            padding: "6px 12px",
            borderRadius: 6,
            background: styling.bg,
            color: styling.text,
            fontWeight: 800,
            fontSize: 11,
            letterSpacing: 0.5,
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
            display: "inline-flex",
            alignItems: "center",
            userSelect: "none"
          }
        },
        tech
      );
    })) : /* @__PURE__ */ React.createElement("div", { style: { color: textMuted, fontSize: 13, fontStyle: "italic" } }, 'No tech stack badges selected yet. Click "Edit profile" to showcase your languages and tools.')))))), activeTab === "repositories" && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, flex: 1, minWidth: 260 } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        placeholder: "Find a repository...",
        value: repoSearch,
        onChange: (e) => setRepoSearch(e.target.value),
        style: { ...inputStyle, width: "100%", maxWidth: 360 }
      }
    ), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: repoTypeFilter,
        onChange: (e) => setRepoTypeFilter(e.target.value),
        style: { ...inputStyle, width: "auto" }
      },
      /* @__PURE__ */ React.createElement("option", { value: "all" }, "Type: All"),
      /* @__PURE__ */ React.createElement("option", { value: "public" }, "Public"),
      /* @__PURE__ */ React.createElement("option", { value: "private" }, "Private")
    )), onOpenCreateRepo && !(user && (user.role === "admin" || user.role_type === "admin")) && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: onOpenCreateRepo,
        style: {
          padding: "9px 18px",
          borderRadius: 8,
          background: "#238636",
          color: "#ffffff",
          fontWeight: 700,
          fontSize: 13,
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 6
        }
      },
      /* @__PURE__ */ React.createElement("span", null, "\u2795"),
      " New"
    ), user && (user.role === "admin" || user.role_type === "admin") && /* @__PURE__ */ React.createElement("span", { style: {
      padding: "6px 14px",
      borderRadius: 8,
      background: "rgba(210,168,255,0.1)",
      border: "1px solid rgba(210,168,255,0.3)",
      color: "#d2a8ff",
      fontSize: 12,
      fontWeight: 700
    } }, "\u{1F6E1}\uFE0F Admin Workspace (Repo creation is for developer accounts)")), filteredRepos.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: {
      textAlign: "center",
      padding: 60,
      background: cardBg,
      border: "1px solid " + cardBorder,
      borderRadius: 12,
      color: textMuted
    } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 36, marginBottom: 8 } }, "\u{1F4C1}"), /* @__PURE__ */ React.createElement("h3", { style: { margin: 0, color: textMain } }, "No repositories match your filter"), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 13, marginTop: 4 } }, isAdmin ? "No repositories found on the platform." : "Create your first repository to showcase your code.")) : /* @__PURE__ */ React.createElement("div", { style: {
      background: cardBg,
      border: "1px solid " + cardBorder,
      borderRadius: 12,
      overflow: "hidden"
    } }, filteredRepos.map((repo) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: repo.id,
        style: {
          padding: "18px 24px",
          borderBottom: "1px solid " + cardBorder,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12
        }
      },
      /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, /* @__PURE__ */ React.createElement(
        "a",
        {
          href: "#",
          onClick: (e) => {
            e.preventDefault();
            if (onSelectRepo) onSelectRepo(repo.id);
          },
          style: {
            fontSize: 18,
            fontWeight: 800,
            color: "#58a6ff",
            textDecoration: "none"
          }
        },
        repo.name
      ), /* @__PURE__ */ React.createElement("span", { style: {
        padding: "2px 8px",
        borderRadius: 12,
        fontSize: 11,
        fontWeight: 700,
        border: "1px solid " + cardBorder,
        color: textMuted
      } }, repo.visibility), isAdmin && repo.owner_name && /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: textMuted } }, "\u{1F464} @", repo.owner_name)), repo.description && /* @__PURE__ */ React.createElement("p", { style: { margin: "6px 0 0", fontSize: 13, color: textMuted } }, repo.description), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 14, marginTop: 8, fontSize: 12, color: textMuted } }, /* @__PURE__ */ React.createElement("span", { style: { display: "flex", alignItems: "center", gap: 5 } }, /* @__PURE__ */ React.createElement("span", { style: { width: 10, height: 10, borderRadius: "50%", background: "#e34c26", display: "inline-block" } }), "HTML / Fullstack"), /* @__PURE__ */ React.createElement("span", null, "Updated ", new Date(repo.created_at).toLocaleDateString()))),
      /* @__PURE__ */ React.createElement("div", null, isAdmin ? /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: async (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
              const newVis = repo.visibility === "public" ? "private" : "public";
              await apiCall(`/repositories/${repo.id}/visibility`, "PUT", { visibility: newVis });
              if (showNotify) showNotify(`Visibility updated to ${newVis}.`);
              window.dispatchEvent(new CustomEvent("refreshRepos"));
            } catch (err) {
              if (showNotify) showNotify(err.message, "error");
            }
          },
          style: {
            padding: "6px 12px",
            borderRadius: 6,
            background: "#21262d",
            border: "1px solid #30363d",
            color: "#e6edf3",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer"
          }
        },
        repo.visibility === "public" ? "\u{1F512} Make Private" : "\u{1F310} Make Public"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!window.confirm(`Delete repository '${repo.name}'?`)) return;
            try {
              await apiCall(`/repositories/${repo.id}`, "DELETE");
              if (showNotify) showNotify(`Repository '${repo.name}' deleted.`);
              window.dispatchEvent(new CustomEvent("refreshRepos"));
            } catch (err) {
              if (showNotify) showNotify(err.message, "error");
            }
          },
          style: {
            padding: "6px 12px",
            borderRadius: 6,
            background: "rgba(248,81,73,0.12)",
            border: "1px solid rgba(248,81,73,0.3)",
            color: "#f85149",
            fontSize: 11,
            fontWeight: 700,
            cursor: "pointer"
          }
        },
        "\u{1F5D1}\uFE0F Delete"
      )) : /* @__PURE__ */ React.createElement(
        "button",
        {
          style: {
            padding: "6px 14px",
            borderRadius: 8,
            background: isDark ? "#21262d" : "#f6f8fa",
            border: "1px solid " + cardBorder,
            color: textMain,
            fontWeight: 700,
            fontSize: 12,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6
          }
        },
        /* @__PURE__ */ React.createElement("span", null, "\u2B50"),
        " Star"
      ))
    )))), activeTab === "edit_profile" && /* @__PURE__ */ React.createElement("form", { onSubmit: handleSaveProfile, style: { display: "flex", flexDirection: "column", gap: 20 } }, /* @__PURE__ */ React.createElement("div", { style: {
      background: cardBg,
      border: "1px solid " + cardBorder,
      borderRadius: 14,
      padding: 24,
      display: "flex",
      flexDirection: "column",
      gap: 18
    } }, /* @__PURE__ */ React.createElement("h3", { style: { margin: 0, fontSize: 18, fontWeight: 800, color: textMain } }, "\u270F\uFE0F Edit Profile Details (User & Admin)"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11, fontWeight: 700, color: textMuted, display: "block", marginBottom: 4 } }, "Full Name"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: profileForm.full_name,
        onChange: (e) => setProfileForm({ ...profileForm, full_name: e.target.value }),
        style: inputStyle,
        placeholder: "e.g. Alex Morgan"
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11, fontWeight: 700, color: textMuted, display: "block", marginBottom: 4 } }, "Username"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: profileForm.username,
        onChange: (e) => setProfileForm({ ...profileForm, username: e.target.value }),
        style: inputStyle,
        placeholder: "e.g. alex_dev"
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11, fontWeight: 700, color: textMuted, display: "block", marginBottom: 4 } }, "Pronouns"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: profileForm.pronouns,
        onChange: (e) => setProfileForm({ ...profileForm, pronouns: e.target.value }),
        style: inputStyle,
        placeholder: "e.g. they/them or she/her or he/him"
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11, fontWeight: 700, color: textMuted, display: "block", marginBottom: 4 } }, "Location"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: profileForm.location,
        onChange: (e) => setProfileForm({ ...profileForm, location: e.target.value }),
        style: inputStyle,
        placeholder: "e.g. San Francisco, CA or Remote"
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11, fontWeight: 700, color: textMuted, display: "block", marginBottom: 4 } }, "Contact Email"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "email",
        value: profileForm.social_email,
        onChange: (e) => setProfileForm({ ...profileForm, social_email: e.target.value }),
        style: inputStyle,
        placeholder: "e.g. alex@example.com"
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11, fontWeight: 700, color: textMuted, display: "block", marginBottom: 4 } }, "Instagram Link"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: profileForm.social_instagram,
        onChange: (e) => setProfileForm({ ...profileForm, social_instagram: e.target.value }),
        style: inputStyle,
        placeholder: "e.g. https://instagram.com/alex_dev"
      }
    )), /* @__PURE__ */ React.createElement("div", { style: { gridColumn: "1 / -1" } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11, fontWeight: 700, color: textMuted, display: "block", marginBottom: 4 } }, "Bio Quotation"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: profileForm.bio,
        onChange: (e) => setProfileForm({ ...profileForm, bio: e.target.value }),
        style: inputStyle,
        placeholder: 'e.g. "Software engineer building distributed systems and high performance web apps."'
      }
    )), /* @__PURE__ */ React.createElement("div", { style: { gridColumn: "1 / -1" } }, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11, fontWeight: 700, color: textMuted, display: "block", marginBottom: 4 } }, "README.md Content (About Me)"), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        rows: 6,
        value: profileForm.readme_content,
        onChange: (e) => setProfileForm({ ...profileForm, readme_content: e.target.value }),
        style: { ...inputStyle, resize: "vertical" },
        placeholder: "\u{1F52D} I'm currently working on...\n\u{1F46F} I'm looking to collaborate on...\n\u{1F331} I'm currently learning..."
      }
    ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 12, fontWeight: 800, color: textMain, display: "block", marginBottom: 8 } }, "\u{1F4BB} Select Your Tech Stack Badges (", profileForm.tech_stack.length, " selected):"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 180, overflowY: "auto", padding: 8, border: "1px solid " + cardBorder, borderRadius: 10 } }, Object.keys(TECH_STACK_COLORS).map((tech) => {
      const isSelected = profileForm.tech_stack.includes(tech);
      const styling = TECH_STACK_COLORS[tech];
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          key: tech,
          onClick: () => {
            const current = profileForm.tech_stack;
            const updated = isSelected ? current.filter((t) => t !== tech) : [...current, tech];
            setProfileForm({ ...profileForm, tech_stack: updated });
          },
          style: {
            padding: "4px 10px",
            borderRadius: 6,
            background: isSelected ? styling.bg : "transparent",
            color: isSelected ? styling.text : textMuted,
            border: "1px solid " + (isSelected ? styling.bg : cardBorder),
            fontWeight: 700,
            fontSize: 11,
            cursor: "pointer"
          }
        },
        isSelected ? "\u2713 " : "+ ",
        " ",
        tech
      );
    }))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 12 } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setActiveTab("overview"),
        style: {
          padding: "10px 20px",
          borderRadius: 10,
          background: "transparent",
          color: textMuted,
          border: "1px solid " + cardBorder,
          cursor: "pointer",
          fontWeight: 700
        }
      },
      "Cancel"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "submit",
        disabled: saving,
        style: {
          padding: "10px 24px",
          borderRadius: 10,
          background: "linear-gradient(135deg, #238636, #2ea043)",
          color: "#ffffff",
          fontWeight: 800,
          border: "none",
          cursor: saving ? "not-allowed" : "pointer"
        }
      },
      saving ? "Saving..." : "\u{1F4BE} Save Profile & Tech Stack"
    )))), activeTab === "security" && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { background: cardBg, border: "1px solid " + cardBorder, borderRadius: 14, padding: 24 } }, /* @__PURE__ */ React.createElement("h3", { style: { margin: "0 0 6px 0", fontSize: 16, fontWeight: 800, color: textMain } }, "\u{1F511} Change Password"), /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 16px 0", fontSize: 13, color: textMuted } }, "Ensure your account uses a strong, secure passphrase."), /* @__PURE__ */ React.createElement("form", { onSubmit: handleChangePassword, style: { display: "flex", flexDirection: "column", gap: 12, maxWidth: 440 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11, fontWeight: 700, color: textMuted, display: "block", marginBottom: 4 } }, "Current Password"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "password",
        required: true,
        value: passwordForm.current_password,
        onChange: (e) => setPasswordForm({ ...passwordForm, current_password: e.target.value }),
        style: inputStyle
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11, fontWeight: 700, color: textMuted, display: "block", marginBottom: 4 } }, "New Password"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "password",
        required: true,
        value: passwordForm.new_password,
        onChange: (e) => setPasswordForm({ ...passwordForm, new_password: e.target.value }),
        style: inputStyle
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { style: { fontSize: 11, fontWeight: 700, color: textMuted, display: "block", marginBottom: 4 } }, "Confirm New Password"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "password",
        required: true,
        value: passwordForm.confirm_password,
        onChange: (e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value }),
        style: inputStyle
      }
    )), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "submit",
        disabled: changingPassword,
        style: {
          marginTop: 6,
          padding: "10px 20px",
          borderRadius: 10,
          background: "#1f6feb",
          color: "#fff",
          fontWeight: 700,
          border: "none",
          cursor: changingPassword ? "not-allowed" : "pointer"
        }
      },
      changingPassword ? "Updating..." : "Update Password"
    ))), /* @__PURE__ */ React.createElement("div", { style: { background: cardBg, border: "1px solid " + cardBorder, borderRadius: 14, padding: 24 } }, /* @__PURE__ */ React.createElement("h3", { style: { margin: "0 0 6px 0", fontSize: 16, fontWeight: 800, color: textMain } }, "\u{1F5DD}\uFE0F Personal Access Tokens"), /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 16px 0", fontSize: 13, color: textMuted } }, "Tokens can be used to authenticate with Git operations and developer APIs."), generatedToken && /* @__PURE__ */ React.createElement("div", { style: { padding: 14, borderRadius: 10, background: "rgba(63,185,80,0.15)", border: "1px solid rgba(63,185,80,0.4)", marginBottom: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#3fb950", marginBottom: 4 } }, "New Token Created (copy now, it won't be shown again):"), /* @__PURE__ */ React.createElement("code", { style: { fontSize: 13, color: textMain, wordBreak: "break-all" } }, generatedToken)), /* @__PURE__ */ React.createElement("form", { onSubmit: handleCreateToken, style: { display: "flex", gap: 10, marginBottom: 16 } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        placeholder: "Token description (e.g. CLI Access)",
        value: newTokenName,
        onChange: (e) => setNewTokenName(e.target.value),
        style: { ...inputStyle, flex: 1 }
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "submit",
        disabled: creatingToken,
        style: {
          padding: "10px 20px",
          borderRadius: 10,
          background: "#238636",
          color: "#fff",
          fontWeight: 700,
          border: "none",
          cursor: "pointer"
        }
      },
      "Generate Token"
    )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, tokens.map((t) => /* @__PURE__ */ React.createElement("div", { key: t.id, style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: 8, background: inputBg, border: "1px solid " + cardBorder } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: 13, color: textMain } }, t.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: textMuted } }, t.token_preview, " \xB7 Created ", new Date(t.created_at).toLocaleDateString())), /* @__PURE__ */ React.createElement("button", { onClick: () => handleDeleteToken(t.id), style: { color: "#f85149", background: "transparent", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700 } }, "Revoke")))))), activeTab === "preferences" && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 20 } }, /* @__PURE__ */ React.createElement("div", { style: { background: cardBg, border: "1px solid " + cardBorder, borderRadius: 14, padding: 24 } }, /* @__PURE__ */ React.createElement("h3", { style: { margin: "0 0 6px 0", fontSize: 16, fontWeight: 800, color: textMain } }, "\u2601\uFE0F Cloud Storage Quota (Virtual Drive)"), /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 16px 0", fontSize: 13, color: textMuted } }, "15 GB free encrypted storage allocated per account for commits and repository trees."), /* @__PURE__ */ React.createElement("div", { style: { height: 8, borderRadius: 4, background: isDark ? "#21262d" : "#eaeef2", overflow: "hidden", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { width: "4%", height: "100%", background: "#58a6ff" } })), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: textMuted } }, "Using ", /* @__PURE__ */ React.createElement("strong", null, settingsData?.quota?.storage_used_bytes ? (settingsData.quota.storage_used_bytes / (1024 * 1024)).toFixed(2) : "0.00", " MB"), " of 15.00 GB")), /* @__PURE__ */ React.createElement("div", { style: { background: cardBg, border: "1px solid rgba(248,81,73,0.3)", borderRadius: 14, padding: 24 } }, /* @__PURE__ */ React.createElement("h3", { style: { margin: "0 0 6px 0", fontSize: 16, fontWeight: 800, color: "#f85149" } }, "\u26A0\uFE0F Account Management"), /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 16px 0", fontSize: 13, color: textMuted } }, "Permanent actions regarding your CodeHub developer profile."), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: onOpenDeleteAccount,
        style: {
          padding: "9px 18px",
          borderRadius: 8,
          background: "rgba(248,81,73,0.1)",
          border: "1px solid rgba(248,81,73,0.4)",
          color: "#f85149",
          fontWeight: 700,
          fontSize: 13,
          cursor: "pointer"
        }
      },
      "Request Account Deletion"
    ))));
  }
  function LoginView({ onSuccess, onSwitchRegister, onBack }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const handleSubmit = async (e) => {
      e.preventDefault();
      setError("");
      const formData = new FormData(e.currentTarget);
      const submitEmail = (formData.get("email") || email || "").toString().trim();
      const submitPassword = (formData.get("password") || password || "").toString();
      if (!submitEmail) {
        setError("Please enter your email address.");
        return;
      }
      if (!submitPassword) {
        setError("Please enter your password.");
        return;
      }
      setLoading(true);
      try {
        const data = await apiCall("/auth/login", "POST", { email: submitEmail, password: submitPassword });
        localStorage.setItem("codehub_token", data.token);
        localStorage.setItem("codehub_user", JSON.stringify(data.user));
        onSuccess(data.user);
      } catch (err) {
        setError(err.message || "Login failed. Please verify credentials.");
      } finally {
        setLoading(false);
      }
    };
    const BUBBLES = [
      { size: 80, left: "8%", delay: "0s", dur: "12s", color: "rgba(88,166,255,0.22)" },
      { size: 50, left: "22%", delay: "2.5s", dur: "10s", color: "rgba(210,168,255,0.22)" },
      { size: 120, left: "40%", delay: "1s", dur: "15s", color: "rgba(88,166,255,0.14)" },
      { size: 60, left: "58%", delay: "3s", dur: "11s", color: "rgba(63,185,80,0.18)" },
      { size: 95, left: "74%", delay: "0.5s", dur: "13s", color: "rgba(210,168,255,0.16)" },
      { size: 40, left: "87%", delay: "4.5s", dur: "9s", color: "rgba(88,166,255,0.25)" },
      { size: 70, left: "5%", delay: "6s", dur: "14s", color: "rgba(121,192,255,0.18)" },
      { size: 55, left: "50%", delay: "7s", dur: "11s", color: "rgba(35,134,54,0.20)" },
      { size: 35, left: "33%", delay: "5s", dur: "8s", color: "rgba(248,81,73,0.12)" },
      { size: 100, left: "65%", delay: "2s", dur: "16s", color: "rgba(88,166,255,0.10)" }
    ];
    return /* @__PURE__ */ React.createElement("div", { style: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", background: "linear-gradient(135deg,#060b14 0%,#0d1f47 55%,#1a0d40 100%)", padding: "20px 16px" } }, BUBBLES.map((b, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "bubble", style: {
      width: b.size,
      height: b.size,
      left: b.left,
      bottom: "-150px",
      background: `radial-gradient(circle at 35% 35%, ${b.color.replace(/[\d.]+\)$/, "0.5)")}, ${b.color})`,
      border: `1.5px solid ${b.color.replace(/[\d.]+\)$/, "0.4)")}`,
      backdropFilter: "blur(1px)",
      animationDuration: b.dur,
      animationDelay: b.delay
    } })), /* @__PURE__ */ React.createElement("div", { style: { background: "rgba(22,27,34,0.88)", backdropFilter: "blur(22px)", border: "1px solid rgba(88,166,255,0.18)", borderRadius: 24, padding: "44px 38px", width: "100%", maxWidth: 440, boxShadow: "0 32px 80px rgba(0,0,0,0.7)", position: "relative", zIndex: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginBottom: 30 } }, /* @__PURE__ */ React.createElement("img", { src: "logo.png", alt: "CodeHub", style: { width: 56, height: 56, borderRadius: 18, margin: "0 auto 14px", display: "block", boxShadow: "0 0 28px rgba(88,166,255,0.45)" } }), /* @__PURE__ */ React.createElement("h2", { style: { fontWeight: 900, fontSize: 26, color: "#e6edf3", margin: "0 0 6px" } }, "Sign in to CodeHub"), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 13, color: "#8b949e", margin: 0 } }, "Welcome back! Enter your login details.")), error && /* @__PURE__ */ React.createElement("div", { style: { background: "rgba(61,11,11,0.9)", border: "1px solid #f85149", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#ffa198", marginBottom: 18, display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("span", null, "\u26A0\uFE0F"), /* @__PURE__ */ React.createElement("span", null, error)), /* @__PURE__ */ React.createElement("form", { onSubmit: handleSubmit, style: { display: "flex", flexDirection: "column", gap: 16 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "login_email", style: { fontSize: 11, fontWeight: 700, color: "#8b949e", display: "block", marginBottom: 7, letterSpacing: "0.07em", textTransform: "uppercase" } }, "Email address ", /* @__PURE__ */ React.createElement("span", { style: { color: "#f85149" } }, "*")), /* @__PURE__ */ React.createElement(
      "input",
      {
        id: "login_email",
        name: "email",
        type: "email",
        autoComplete: "email",
        required: true,
        value: email,
        onChange: (e) => setEmail(e.target.value),
        placeholder: "you@example.com",
        style: { width: "100%", boxSizing: "border-box", padding: "12px 15px", borderRadius: 14, border: "1px solid rgba(48,54,61,0.9)", background: "rgba(13,17,23,0.85)", color: "#e6edf3", fontSize: 14, outline: "none", transition: "border-color 0.2s" },
        onFocus: (e) => e.target.style.borderColor = "#58a6ff",
        onBlur: (e) => e.target.style.borderColor = "rgba(48,54,61,0.9)"
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "login_password", style: { fontSize: 11, fontWeight: 700, color: "#8b949e", display: "block", marginBottom: 7, letterSpacing: "0.07em", textTransform: "uppercase" } }, "Password ", /* @__PURE__ */ React.createElement("span", { style: { color: "#f85149" } }, "*")), /* @__PURE__ */ React.createElement("div", { style: { position: "relative" } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        id: "login_password",
        name: "password",
        type: showPassword ? "text" : "password",
        autoComplete: "current-password",
        required: true,
        value: password,
        onChange: (e) => setPassword(e.target.value),
        placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
        style: { width: "100%", boxSizing: "border-box", padding: "12px 44px 12px 15px", borderRadius: 14, border: "1px solid rgba(48,54,61,0.9)", background: "rgba(13,17,23,0.85)", color: "#e6edf3", fontSize: 14, outline: "none", transition: "border-color 0.2s" },
        onFocus: (e) => e.target.style.borderColor = "#58a6ff",
        onBlur: (e) => e.target.style.borderColor = "rgba(48,54,61,0.9)"
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setShowPassword((s) => !s),
        style: { position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#8b949e", cursor: "pointer", fontSize: 15, padding: 4, lineHeight: 1 },
        title: showPassword ? "Hide password" : "Show password"
      },
      showPassword ? "\u{1F648}" : "\u{1F441}\uFE0F"
    ))), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "submit",
        disabled: loading,
        style: {
          marginTop: 6,
          padding: "14px",
          borderRadius: 16,
          fontWeight: 800,
          fontSize: 15,
          background: loading ? "rgba(33,38,45,0.9)" : "linear-gradient(135deg,#238636,#2ea043)",
          color: loading ? "#8b949e" : "#ffffff",
          border: "none",
          cursor: loading ? "not-allowed" : "pointer",
          boxShadow: loading ? "none" : "0 8px 26px rgba(35,134,54,0.48)",
          transition: "all 0.2s",
          letterSpacing: "0.02em"
        }
      },
      loading ? "Authenticating..." : "\u{1F510} Sign In"
    )), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginTop: 24, fontSize: 13, color: "#8b949e" } }, "New to CodeHub?", " ", /* @__PURE__ */ React.createElement("button", { onClick: onSwitchRegister, style: { color: "#58a6ff", background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13 } }, "Create an account \u2192")), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginTop: 10 } }, /* @__PURE__ */ React.createElement("button", { onClick: onBack, style: { fontSize: 12, color: "#6e7681", background: "none", border: "none", cursor: "pointer" } }, "\u2190 Back to Home"))));
  }
  function RegisterView({ onSuccess, onSwitchLogin, onBack }) {
    const [form, setForm] = useState({
      email: "",
      password: "",
      full_name: "",
      username: "",
      bio: "",
      organization: ""
    });
    const [avatarUrl, setAvatarUrl] = useState("");
    const [avatarPreview, setAvatarPreview] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const fileInputRef = useRef(null);
    const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
    const handleAvatarSelect = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        setError("Image size must be less than 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        setAvatarUrl(dataUrl);
        setAvatarPreview(dataUrl);
      };
      reader.readAsDataURL(file);
    };
    const handleRemoveAvatar = () => {
      setAvatarUrl("");
      setAvatarPreview("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    const handleSubmit = async (e) => {
      e.preventDefault();
      setError("");
      const formData = new FormData(e.currentTarget);
      const submitEmail = (formData.get("email") || form.email || "").toString().trim();
      const submitPassword = (formData.get("password") || form.password || "").toString();
      const submitFullName = (formData.get("full_name") || form.full_name || "").toString().trim();
      const submitUsername = (formData.get("username") || form.username || "").toString().trim();
      const submitOrg = (formData.get("organization") || form.organization || "").toString().trim();
      const submitBio = (formData.get("bio") || form.bio || "").toString().trim();
      if (!submitEmail) {
        setError("Valid email address is required.");
        return;
      }
      if (submitPassword.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      setLoading(true);
      try {
        const data = await apiCall("/auth/register", "POST", {
          email: submitEmail,
          password: submitPassword,
          full_name: submitFullName,
          username: submitUsername,
          organization: submitOrg,
          bio: submitBio,
          avatar_url: avatarUrl
        });
        localStorage.setItem("codehub_token", data.token);
        localStorage.setItem("codehub_user", JSON.stringify(data.user));
        onSuccess(data.user);
      } catch (err) {
        setError(err.message || "Registration failed.");
      } finally {
        setLoading(false);
      }
    };
    const REG_BUBBLES = [
      { size: 90, left: "6%", delay: "0s", dur: "13s", color: "rgba(88,166,255,0.20)" },
      { size: 55, left: "20%", delay: "2s", dur: "10s", color: "rgba(210,168,255,0.22)" },
      { size: 130, left: "38%", delay: "1s", dur: "16s", color: "rgba(88,166,255,0.12)" },
      { size: 65, left: "55%", delay: "3.5s", dur: "11s", color: "rgba(63,185,80,0.18)" },
      { size: 100, left: "72%", delay: "0.8s", dur: "14s", color: "rgba(210,168,255,0.15)" },
      { size: 45, left: "88%", delay: "5s", dur: "9s", color: "rgba(88,166,255,0.24)" },
      { size: 75, left: "4%", delay: "7s", dur: "15s", color: "rgba(121,192,255,0.16)" },
      { size: 50, left: "48%", delay: "6s", dur: "12s", color: "rgba(35,134,54,0.20)" },
      { size: 38, left: "30%", delay: "4s", dur: "8s", color: "rgba(248,81,73,0.12)" },
      { size: 110, left: "63%", delay: "2.5s", dur: "17s", color: "rgba(88,166,255,0.10)" }
    ];
    const INP = { width: "100%", boxSizing: "border-box", padding: "11px 14px", borderRadius: 12, border: "1px solid rgba(48,54,61,0.9)", background: "rgba(13,17,23,0.85)", color: "#e6edf3", fontSize: 13, outline: "none", transition: "border-color 0.2s" };
    const onFoc = (e) => e.target.style.borderColor = "#58a6ff";
    const onBlr = (e) => e.target.style.borderColor = "rgba(48,54,61,0.9)";
    return /* @__PURE__ */ React.createElement("div", { style: { minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center", position: "relative", overflow: "hidden", background: "linear-gradient(135deg,#060b14 0%,#0d1f47 50%,#1a0d40 100%)", padding: "30px 16px" } }, REG_BUBBLES.map((b, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "bubble", style: {
      width: b.size,
      height: b.size,
      left: b.left,
      bottom: "-150px",
      background: `radial-gradient(circle at 35% 35%, ${b.color.replace(/[\d.]+\)$/, "0.5)")}, ${b.color})`,
      border: `1.5px solid ${b.color.replace(/[\d.]+\)$/, "0.4)")}`,
      backdropFilter: "blur(1px)",
      animationDuration: b.dur,
      animationDelay: b.delay
    } })), /* @__PURE__ */ React.createElement("div", { style: { background: "rgba(22,27,34,0.88)", backdropFilter: "blur(22px)", border: "1px solid rgba(88,166,255,0.18)", borderRadius: 24, padding: "40px 36px", width: "100%", maxWidth: 520, boxShadow: "0 32px 80px rgba(0,0,0,0.7)", position: "relative", zIndex: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginBottom: 24 } }, /* @__PURE__ */ React.createElement("img", { src: "logo.png", alt: "CodeHub", style: { width: 52, height: 52, borderRadius: 16, margin: "0 auto 12px", display: "block", boxShadow: "0 0 26px rgba(88,166,255,0.42)" } }), /* @__PURE__ */ React.createElement("h2", { style: { fontWeight: 900, fontSize: 24, color: "#e6edf3", margin: "0 0 4px" } }, "Create your account"), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 13, color: "#8b949e", margin: 0 } }, "Join developers building on CodeHub.")), error && /* @__PURE__ */ React.createElement("div", { style: { background: "rgba(61,11,11,0.9)", border: "1px solid #f85149", borderRadius: 12, padding: "10px 14px", fontSize: 13, color: "#ffa198", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("span", null, "\u26A0\uFE0F"), /* @__PURE__ */ React.createElement("span", null, error)), /* @__PURE__ */ React.createElement("form", { onSubmit: handleSubmit, style: { display: "flex", flexDirection: "column", gap: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { background: "rgba(13,17,23,0.7)", border: "1px dashed rgba(88,166,255,0.3)", borderRadius: 14, padding: 14, display: "flex", alignItems: "center", gap: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { position: "relative", flexShrink: 0 } }, avatarPreview ? /* @__PURE__ */ React.createElement("img", { src: avatarPreview, alt: "Preview", style: { width: 60, height: 60, borderRadius: "50%", objectFit: "cover", border: "2px solid #58a6ff" } }) : /* @__PURE__ */ React.createElement("div", { style: { width: 60, height: 60, borderRadius: "50%", background: "#21262d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, color: "#8b949e" } }, "\u{1F4F7}")), /* @__PURE__ */ React.createElement("div", { style: { flex: 1 } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: "#e6edf3" } }, "Profile Photo (Optional)"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: "#8b949e", marginBottom: 8 } }, "JPG, PNG, GIF up to 5MB"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement("input", { ref: fileInputRef, type: "file", accept: "image/*", onChange: handleAvatarSelect, style: { display: "none" } }), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => fileInputRef.current?.click(),
        style: { padding: "5px 12px", borderRadius: 10, fontSize: 11, fontWeight: 600, background: "rgba(31,111,235,0.15)", color: "#58a6ff", border: "1px solid rgba(88,166,255,0.3)", cursor: "pointer" }
      },
      avatarPreview ? "Change Photo" : "Upload Photo"
    ), avatarPreview && /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: handleRemoveAvatar,
        style: { padding: "5px 10px", borderRadius: 10, fontSize: 11, fontWeight: 600, background: "transparent", color: "#f85149", border: "1px solid rgba(248,81,73,0.3)", cursor: "pointer" }
      },
      "Remove"
    )))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "reg_email", style: { fontSize: 11, fontWeight: 700, color: "#8b949e", display: "block", marginBottom: 6, letterSpacing: "0.07em", textTransform: "uppercase" } }, "Email address ", /* @__PURE__ */ React.createElement("span", { style: { color: "#f85149" } }, "*")), /* @__PURE__ */ React.createElement(
      "input",
      {
        id: "reg_email",
        name: "email",
        type: "email",
        autoComplete: "email",
        required: true,
        placeholder: "you@example.com",
        value: form.email,
        onChange: set("email"),
        style: INP,
        onFocus: onFoc,
        onBlur: onBlr
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "reg_password", style: { fontSize: 11, fontWeight: 700, color: "#8b949e", display: "block", marginBottom: 6, letterSpacing: "0.07em", textTransform: "uppercase" } }, "Password (min 6 chars) ", /* @__PURE__ */ React.createElement("span", { style: { color: "#f85149" } }, "*")), /* @__PURE__ */ React.createElement("div", { style: { position: "relative" } }, /* @__PURE__ */ React.createElement(
      "input",
      {
        id: "reg_password",
        name: "password",
        type: showPassword ? "text" : "password",
        autoComplete: "new-password",
        required: true,
        placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
        value: form.password,
        onChange: set("password"),
        style: { ...INP, paddingRight: 42 },
        onFocus: onFoc,
        onBlur: onBlr
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: () => setShowPassword((s) => !s),
        style: { position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#8b949e", cursor: "pointer", fontSize: 14, padding: 4, lineHeight: 1 }
      },
      showPassword ? "\u{1F648}" : "\u{1F441}\uFE0F"
    ))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "reg_full_name", style: { fontSize: 11, fontWeight: 700, color: "#8b949e", display: "block", marginBottom: 6, letterSpacing: "0.07em", textTransform: "uppercase" } }, "Full Name"), /* @__PURE__ */ React.createElement(
      "input",
      {
        id: "reg_full_name",
        name: "full_name",
        type: "text",
        autoComplete: "name",
        placeholder: "Ada Lovelace",
        value: form.full_name,
        onChange: set("full_name"),
        style: INP,
        onFocus: onFoc,
        onBlur: onBlr
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "reg_username", style: { fontSize: 11, fontWeight: 700, color: "#8b949e", display: "block", marginBottom: 6, letterSpacing: "0.07em", textTransform: "uppercase" } }, "Username"), /* @__PURE__ */ React.createElement(
      "input",
      {
        id: "reg_username",
        name: "username",
        type: "text",
        autoComplete: "username",
        placeholder: "ada-lovelace",
        value: form.username,
        onChange: set("username"),
        style: INP,
        onFocus: onFoc,
        onBlur: onBlr
      }
    ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "reg_org", style: { fontSize: 11, fontWeight: 700, color: "#8b949e", display: "block", marginBottom: 6, letterSpacing: "0.07em", textTransform: "uppercase" } }, "Organization / Company"), /* @__PURE__ */ React.createElement(
      "input",
      {
        id: "reg_org",
        name: "organization",
        type: "text",
        autoComplete: "organization",
        placeholder: "Acme Corp, University, etc.",
        value: form.organization,
        onChange: set("organization"),
        style: INP,
        onFocus: onFoc,
        onBlur: onBlr
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { htmlFor: "reg_bio", style: { fontSize: 11, fontWeight: 700, color: "#8b949e", display: "block", marginBottom: 6, letterSpacing: "0.07em", textTransform: "uppercase" } }, "Bio"), /* @__PURE__ */ React.createElement(
      "textarea",
      {
        id: "reg_bio",
        name: "bio",
        rows: "2",
        placeholder: "Tell the community about your development focus...",
        value: form.bio,
        onChange: set("bio"),
        style: { ...INP, resize: "vertical" },
        onFocus: onFoc,
        onBlur: onBlr
      }
    )), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "submit",
        disabled: loading,
        style: {
          marginTop: 4,
          padding: "14px",
          borderRadius: 16,
          fontWeight: 800,
          fontSize: 15,
          background: loading ? "rgba(33,38,45,0.9)" : "linear-gradient(135deg,#238636,#2ea043)",
          color: loading ? "#8b949e" : "#ffffff",
          border: "none",
          cursor: loading ? "not-allowed" : "pointer",
          boxShadow: loading ? "none" : "0 8px 26px rgba(35,134,54,0.48)",
          transition: "all 0.2s",
          letterSpacing: "0.02em"
        }
      },
      loading ? "Creating account..." : "\u{1F680} Create Account"
    )), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginTop: 20, fontSize: 13, color: "#8b949e" } }, "Already have an account?", " ", /* @__PURE__ */ React.createElement("button", { onClick: onSwitchLogin, style: { color: "#58a6ff", background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13 } }, "Sign in \u2192")), /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", marginTop: 10 } }, /* @__PURE__ */ React.createElement("button", { onClick: onBack, style: { fontSize: 12, color: "#6e7681", background: "none", border: "none", cursor: "pointer" } }, "\u2190 Back to Home"))));
  }
  function RepoDetailView({ repoId, user, onBack, showNotify, theme }) {
    const isDark = theme !== "light";
    const cardBg = isDark ? "#161b22" : "#ffffff";
    const cardBorder = isDark ? "#30363d" : "#d0d7de";
    const textMain = isDark ? "#e6edf3" : "#1f2328";
    const textMuted = isDark ? "#8b949e" : "#57606a";
    const inputBg = isDark ? "#0d1117" : "#ffffff";
    const innerBg = isDark ? "#0d1117" : "#f6f8fa";
    const shadow = isDark ? "0 8px 24px rgba(0,0,0,0.3)" : "0 1px 3px rgba(31, 35, 40, 0.08)";
    const [repo, setRepo] = useState(null);
    const [branches, setBranches] = useState([]);
    const [activeBranchId, setActiveBranchId] = useState(null);
    const [files, setFiles] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);
    const [fileContent, setFileContent] = useState("");
    const [fileHistory, setFileHistory] = useState([]);
    const [activeTab, setActiveTab] = useState("code");
    const [itemsList, setItemsList] = useState([]);
    const [isEditingFile, setIsEditingFile] = useState(false);
    const [editFileName, setEditFileName] = useState("");
    const [editFileContent, setEditFileContent] = useState("");
    const [commitMessage, setCommitMessage] = useState("");
    const [isNewBranchOpen, setIsNewBranchOpen] = useState(false);
    const [newBranchName, setNewBranchName] = useState("");
    const [isNewItemOpen, setIsNewItemOpen] = useState(false);
    const [itemType, setItemType] = useState("issue");
    const [itemTitle, setItemTitle] = useState("");
    const [itemDesc, setItemDesc] = useState("");
    const loadRepoDetails = async () => {
      try {
        const data = await apiCall(`/repositories/${repoId}`);
        setRepo(data.repository);
        setBranches(data.branches || []);
        if (data.branches?.length > 0 && !activeBranchId) setActiveBranchId(data.branches[0].id);
      } catch (err) {
        showNotify(err.message, "error");
        onBack();
      }
    };
    const loadFiles = async () => {
      if (!activeBranchId) return;
      try {
        const data = await apiCall(`/repositories/${repoId}/files?branch_id=${activeBranchId}`);
        setFiles(data.files || []);
        if (data.files.length > 0 && !selectedFile) loadFileContent(data.files[0].id);
      } catch (err) {
        console.error(err);
      }
    };
    const loadFileContent = async (fileId) => {
      try {
        const data = await apiCall(`/repositories/${repoId}/files/${fileId}`);
        setSelectedFile(data.file);
        setFileContent(data.content);
        setFileHistory(data.history || []);
      } catch (err) {
        showNotify(err.message, "error");
      }
    };
    const loadIssuesAndPulls = async () => {
      try {
        const d = await apiCall(`/repositories/${repoId}/issues-pulls`);
        setItemsList(d.items || []);
      } catch (err) {
        console.error(err);
      }
    };
    useEffect(() => {
      loadRepoDetails();
    }, [repoId]);
    useEffect(() => {
      if (activeBranchId) loadFiles();
    }, [activeBranchId]);
    useEffect(() => {
      if (activeTab === "issues_prs") loadIssuesAndPulls();
    }, [activeTab]);
    const handleCreateBranch = async (e) => {
      e.preventDefault();
      try {
        const r = await apiCall(`/repositories/${repoId}/branches`, "POST", { branch_name: newBranchName, from_branch_id: activeBranchId });
        showNotify(r.message);
        setIsNewBranchOpen(false);
        setNewBranchName("");
        loadRepoDetails();
      } catch (err) {
        showNotify(err.message, "error");
      }
    };
    const handleSaveFile = async (e) => {
      e.preventDefault();
      try {
        const r = await apiCall(`/repositories/${repoId}/files`, "POST", { branch_id: activeBranchId, file_path: editFileName, content: editFileContent, commit_message: commitMessage || `Update ${editFileName}` });
        showNotify(r.message);
        setIsEditingFile(false);
        setCommitMessage("");
        loadFiles();
        loadFileContent(r.file_id);
      } catch (err) {
        showNotify(err.message, "error");
      }
    };
    const handleRollback = async (versionNumber) => {
      if (!selectedFile || !confirm(`Rollback ${selectedFile.file_path} to v${versionNumber}?`)) return;
      try {
        const r = await apiCall(`/repositories/${repoId}/files/${selectedFile.id}/rollback`, "POST", { version_number: versionNumber });
        showNotify(r.message);
        loadFileContent(selectedFile.id);
        loadFiles();
      } catch (err) {
        showNotify(err.message, "error");
      }
    };
    const handleDeleteRepo = async () => {
      if (!confirm(`Delete repository '${repo.name}'? This is irreversible.`)) return;
      try {
        const r = await apiCall(`/repositories/${repoId}`, "DELETE");
        showNotify(r.message, "info");
        onBack();
      } catch (err) {
        showNotify(err.message, "error");
      }
    };
    const handleCreateItem = async (e) => {
      e.preventDefault();
      try {
        const r = await apiCall(`/repositories/${repoId}/issues-pulls`, "POST", { type: itemType, title: itemTitle, description: itemDesc });
        showNotify(r.message);
        setIsNewItemOpen(false);
        setItemTitle("");
        setItemDesc("");
        loadIssuesAndPulls();
      } catch (err) {
        showNotify(err.message, "error");
      }
    };
    const handleUpdateItemStatus = async (itemId, newStatus) => {
      try {
        const r = await apiCall(`/repositories/${repoId}/issues-pulls/${itemId}/status`, "PUT", { status: newStatus });
        showNotify(r.message);
        loadIssuesAndPulls();
      } catch (err) {
        showNotify(err.message, "error");
      }
    };
    if (!repo) {
      return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", gap: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { width: 44, height: 44, border: "3px solid rgba(88, 166, 255, 0.2)", borderTopColor: "#58a6ff", borderRadius: "50%", animation: "codehubSpin 0.75s linear infinite" } }), /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: 15, color: textMain } }, "Loading repository workspace\u2026"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: textMuted } }, "Fetching tree, branches, and version history"));
    }
    const isOwnerOrAdmin = user && (user.role === "admin" || user.id == repo.user_id);
    const isPub = repo.visibility === "public";
    const badgeBg = isPub ? isDark ? "rgba(63,185,80,0.15)" : "#dcfce7" : isDark ? "rgba(210,168,255,0.15)" : "#f3e8ff";
    const badgeText = isPub ? isDark ? "#3fb950" : "#15803d" : isDark ? "#d2a8ff" : "#7c3aed";
    const badgeBorder = isPub ? isDark ? "rgba(63,185,80,0.3)" : "#bbf7d0" : isDark ? "rgba(210,168,255,0.3)" : "#e9d5ff";
    return /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 1100, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: 22 } }, /* @__PURE__ */ React.createElement("div", { style: {
      background: isDark ? "linear-gradient(135deg, #0d1f47, #161b22)" : "linear-gradient(135deg, #e0f2fe, #f0fdf4)",
      border: "1px solid " + (isDark ? cardBorder : "#bae6fd"),
      borderRadius: 16,
      padding: "24px 28px",
      display: "flex",
      flexDirection: "column",
      gap: 14,
      boxShadow: shadow
    } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: onBack,
        style: {
          background: isDark ? "#21262d" : "#ffffff",
          border: `1px solid ${cardBorder}`,
          color: isDark ? "#58a6ff" : "#0969da",
          padding: "6px 14px",
          borderRadius: 20,
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          boxShadow: isDark ? "none" : "0 1px 2px rgba(31,35,40,0.04)"
        }
      },
      "\u2190 Back to Repositories"
    ), isOwnerOrAdmin && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleDeleteRepo,
        style: {
          padding: "7px 16px",
          borderRadius: 10,
          fontSize: 12,
          fontWeight: 700,
          background: isDark ? "rgba(248,81,73,0.1)" : "#fee2e2",
          color: isDark ? "#f85149" : "#b91c1c",
          border: `1px solid ${isDark ? "rgba(248,81,73,0.3)" : "#fecaca"}`,
          cursor: "pointer"
        }
      },
      "\u{1F5D1}\uFE0F Delete Repo"
    )), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("h1", { style: { fontWeight: 900, fontSize: 24, color: textMain, margin: 0 } }, "\u{1F4E6} ", repo.name), /* @__PURE__ */ React.createElement("span", { style: {
      fontSize: 11,
      padding: "3px 10px",
      borderRadius: 20,
      fontWeight: 800,
      textTransform: "uppercase",
      background: badgeBg,
      color: badgeText,
      border: `1px solid ${badgeBorder}`
    } }, repo.visibility)), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 13, color: textMuted, margin: "6px 0 0" } }, repo.description || "No description provided."), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, color: isDark ? "#3fb950" : "#15803d", fontFamily: "monospace", margin: "4px 0 0" } }, "\u2601\uFE0F Drive Storage ID: ", repo.google_drive_folder_id)))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10 } }, [["code", "\u{1F4C1} Code Tree"], ["issues_prs", `\u{1F500} Issues & PRs (${itemsList.length})`]].map(([k, label]) => {
      const active = activeTab === k;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: k,
          onClick: () => setActiveTab(k),
          style: {
            padding: "8px 18px",
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 700,
            background: active ? isDark ? "#1f6feb" : "#e0f2fe" : isDark ? "#21262d" : "#ffffff",
            color: active ? isDark ? "#fff" : "#0969da" : textMuted,
            border: active ? isDark ? "none" : "1px solid #bae6fd" : isDark ? "1px solid #30363d" : "1px solid #d0d7de",
            cursor: "pointer",
            boxShadow: isDark ? "none" : "0 1px 2px rgba(31,35,40,0.04)"
          }
        },
        label
      );
    })), activeTab === "code" ? /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: textMuted, fontWeight: 600 } }, "Branch:"), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: activeBranchId || "",
        onChange: (e) => {
          setActiveBranchId(Number(e.target.value));
          setSelectedFile(null);
        },
        style: {
          padding: "7px 14px",
          borderRadius: 10,
          border: `1px solid ${cardBorder}`,
          background: inputBg,
          color: isDark ? "#58a6ff" : "#0969da",
          fontSize: 12,
          fontWeight: 700
        }
      },
      branches.map((b) => /* @__PURE__ */ React.createElement("option", { key: b.id, value: b.id }, "\u{1F33F} ", b.branch_name))
    ), isOwnerOrAdmin && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setIsNewBranchOpen(true),
        style: {
          padding: "7px 14px",
          borderRadius: 10,
          fontSize: 12,
          fontWeight: 700,
          border: `1px solid ${cardBorder}`,
          background: isDark ? "#21262d" : "#f6f8fa",
          color: textMain,
          cursor: "pointer"
        }
      },
      "+ Branch"
    )), isOwnerOrAdmin && user?.role !== "admin" && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setEditFileName("new_file.js");
          setEditFileContent("// Write code here\n");
          setIsEditingFile(true);
        },
        style: {
          padding: "8px 18px",
          borderRadius: 10,
          fontSize: 12,
          fontWeight: 700,
          background: "linear-gradient(135deg, #238636, #2ea043)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(35,134,54,0.3)"
        }
      },
      "+ Add File"
    )), isNewBranchOpen && /* @__PURE__ */ React.createElement(
      "form",
      {
        onSubmit: handleCreateBranch,
        style: {
          display: "flex",
          gap: 10,
          padding: "14px 18px",
          background: cardBg,
          borderRadius: 12,
          border: `1px solid ${cardBorder}`,
          boxShadow: shadow
        }
      },
      /* @__PURE__ */ React.createElement(
        "input",
        {
          required: true,
          placeholder: "feature/my-feature",
          value: newBranchName,
          onChange: (e) => setNewBranchName(e.target.value),
          style: {
            flex: 1,
            padding: "8px 14px",
            borderRadius: 8,
            border: `1px solid ${cardBorder}`,
            background: inputBg,
            color: textMain,
            fontSize: 12
          }
        }
      ),
      /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "submit",
          style: {
            padding: "8px 18px",
            borderRadius: 8,
            background: "#1f6feb",
            color: "#fff",
            fontWeight: 700,
            fontSize: 12,
            border: "none",
            cursor: "pointer"
          }
        },
        "Create"
      ),
      /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => setIsNewBranchOpen(false),
          style: { fontSize: 12, color: textMuted, background: "none", border: "none", cursor: "pointer" }
        },
        "Cancel"
      )
    ), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "220px 1fr", gap: 16 } }, /* @__PURE__ */ React.createElement("div", { style: {
      background: cardBg,
      border: `1px solid ${cardBorder}`,
      borderRadius: 14,
      padding: 16,
      boxShadow: shadow
    } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, fontWeight: 800, color: textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 } }, "Files"), files.map((f) => {
      const isSel = selectedFile?.id === f.id;
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: f.id,
          onClick: () => loadFileContent(f.id),
          style: {
            padding: "8px 12px",
            borderRadius: 8,
            cursor: "pointer",
            fontSize: 12,
            fontFamily: "monospace",
            marginBottom: 4,
            background: isSel ? isDark ? "rgba(88,166,255,0.15)" : "#e0f2fe" : "transparent",
            color: isSel ? isDark ? "#58a6ff" : "#0969da" : textMuted,
            border: isSel ? `1px solid ${isDark ? "rgba(88,166,255,0.3)" : "#bae6fd"}` : "1px solid transparent",
            fontWeight: isSel ? 700 : 500
          }
        },
        "\u{1F4C4} ",
        f.file_path
      );
    }), files.length === 0 && /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, color: textMuted } }, "No files yet.")), /* @__PURE__ */ React.createElement("div", null, isEditingFile ? /* @__PURE__ */ React.createElement(
      "form",
      {
        onSubmit: handleSaveFile,
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 12,
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 14,
          padding: 18,
          boxShadow: shadow
        }
      },
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, alignItems: "center" } }, /* @__PURE__ */ React.createElement(
        "input",
        {
          value: editFileName,
          onChange: (e) => setEditFileName(e.target.value),
          style: {
            flex: 1,
            padding: "8px 14px",
            borderRadius: 8,
            border: `1px solid ${cardBorder}`,
            background: inputBg,
            color: isDark ? "#58a6ff" : "#0969da",
            fontSize: 12,
            fontFamily: "monospace",
            fontWeight: 700
          }
        }
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => setIsEditingFile(false),
          style: { fontSize: 12, color: textMuted, background: "none", border: "none", cursor: "pointer" }
        },
        "Cancel"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "submit",
          style: {
            padding: "8px 18px",
            borderRadius: 8,
            background: "linear-gradient(135deg, #238636, #2ea043)",
            color: "#fff",
            fontWeight: 700,
            fontSize: 12,
            border: "none",
            cursor: "pointer"
          }
        },
        "Commit & Push"
      )),
      /* @__PURE__ */ React.createElement(
        "textarea",
        {
          rows: "18",
          value: editFileContent,
          onChange: (e) => setEditFileContent(e.target.value),
          style: {
            padding: 16,
            borderRadius: 8,
            background: isDark ? "#010409" : "#f6f8fa",
            color: isDark ? "#7ee787" : "#1f2328",
            fontFamily: "monospace",
            fontSize: 12,
            border: `1px solid ${cardBorder}`,
            lineHeight: 1.6
          }
        }
      ),
      /* @__PURE__ */ React.createElement(
        "input",
        {
          placeholder: "Commit message...",
          value: commitMessage,
          onChange: (e) => setCommitMessage(e.target.value),
          style: {
            padding: "8px 14px",
            borderRadius: 8,
            border: `1px solid ${cardBorder}`,
            background: inputBg,
            color: textMain,
            fontSize: 12
          }
        }
      )
    ) : selectedFile ? /* @__PURE__ */ React.createElement("div", { style: {
      background: cardBg,
      border: `1px solid ${cardBorder}`,
      borderRadius: 14,
      overflow: "hidden",
      boxShadow: shadow
    } }, /* @__PURE__ */ React.createElement("div", { style: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "12px 18px",
      background: innerBg,
      borderBottom: `1px solid ${cardBorder}`
    } }, /* @__PURE__ */ React.createElement("span", { style: { fontFamily: "monospace", fontSize: 13, color: isDark ? "#58a6ff" : "#0969da", fontWeight: 700 } }, "\u{1F4C4} ", selectedFile.file_path), isOwnerOrAdmin && user?.role !== "admin" && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setEditFileName(selectedFile.file_path);
          setEditFileContent(fileContent);
          setIsEditingFile(true);
        },
        style: {
          padding: "6px 14px",
          borderRadius: 8,
          fontSize: 11,
          fontWeight: 700,
          background: isDark ? "rgba(88,166,255,0.1)" : "#e0f2fe",
          color: isDark ? "#58a6ff" : "#0969da",
          border: `1px solid ${isDark ? "rgba(88,166,255,0.3)" : "#bae6fd"}`,
          cursor: "pointer"
        }
      },
      "\u270F\uFE0F Edit"
    )), /* @__PURE__ */ React.createElement("pre", { style: {
      padding: 18,
      background: isDark ? "#010409" : "#f6f8fa",
      color: textMain,
      fontFamily: "monospace",
      fontSize: 12,
      overflow: "auto",
      maxHeight: 420,
      margin: 0,
      lineHeight: 1.6
    } }, /* @__PURE__ */ React.createElement("code", null, fileContent)), fileHistory.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { padding: 18, borderTop: `1px solid ${cardBorder}` } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, fontWeight: 800, color: textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 } }, "\u23F3 Version History"), fileHistory.map((vh) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: vh.id,
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 14px",
          borderRadius: 8,
          marginBottom: 6,
          background: innerBg,
          border: `1px solid ${cardBorder}`
        }
      },
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, /* @__PURE__ */ React.createElement("span", { style: {
        padding: "2px 8px",
        borderRadius: 4,
        background: isDark ? "rgba(88,166,255,0.15)" : "#e0f2fe",
        color: isDark ? "#58a6ff" : "#0969da",
        fontFamily: "monospace",
        fontSize: 11,
        fontWeight: 700
      } }, "v", vh.version_number), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: textMain } }, vh.commit_message)),
      isOwnerOrAdmin && user?.role !== "admin" && /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => handleRollback(vh.version_number),
          style: {
            padding: "4px 12px",
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 700,
            background: isDark ? "rgba(227,179,65,0.15)" : "#fef9c3",
            color: isDark ? "#e3b341" : "#a16207",
            border: `1px solid ${isDark ? "rgba(227,179,65,0.3)" : "#fef08a"}`,
            cursor: "pointer"
          }
        },
        "\u23EA Rollback"
      )
    )))) : /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: 60, color: textMuted, background: cardBg, borderRadius: 14, border: `1px solid ${cardBorder}` } }, "Select a file to view its contents.")))) : /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("h3", { style: { fontWeight: 800, fontSize: 16, color: textMain, margin: 0 } }, "Issues & Pull Requests"), user?.is_verified && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setIsNewItemOpen(true),
        style: {
          padding: "8px 18px",
          borderRadius: 10,
          fontWeight: 700,
          fontSize: 12,
          background: "linear-gradient(135deg, #238636, #2ea043)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(35,134,54,0.3)"
        }
      },
      "+ New Issue / PR"
    )), isNewItemOpen && /* @__PURE__ */ React.createElement(
      "form",
      {
        onSubmit: handleCreateItem,
        style: {
          background: cardBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 14,
          padding: 20,
          display: "flex",
          flexDirection: "column",
          gap: 14,
          boxShadow: shadow
        }
      },
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 16 } }, [["issue", "\u{1F41E} Issue"], ["pull_request", "\u{1F500} Pull Request"]].map(([val, lbl]) => /* @__PURE__ */ React.createElement("label", { key: val, style: { display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, cursor: "pointer", color: textMain } }, /* @__PURE__ */ React.createElement("input", { type: "radio", checked: itemType === val, onChange: () => setItemType(val) }), " ", lbl))),
      /* @__PURE__ */ React.createElement(
        "input",
        {
          required: true,
          placeholder: "Title",
          value: itemTitle,
          onChange: (e) => setItemTitle(e.target.value),
          style: {
            padding: "10px 14px",
            borderRadius: 8,
            border: `1px solid ${cardBorder}`,
            background: inputBg,
            color: textMain,
            fontSize: 13
          }
        }
      ),
      /* @__PURE__ */ React.createElement(
        "textarea",
        {
          rows: "3",
          placeholder: "Description...",
          value: itemDesc,
          onChange: (e) => setItemDesc(e.target.value),
          style: {
            padding: "10px 14px",
            borderRadius: 8,
            border: `1px solid ${cardBorder}`,
            background: inputBg,
            color: textMain,
            fontSize: 13
          }
        }
      ),
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: 10 } }, /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "button",
          onClick: () => setIsNewItemOpen(false),
          style: { fontSize: 13, color: textMuted, background: "none", border: "none", cursor: "pointer" }
        },
        "Cancel"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "submit",
          style: {
            padding: "8px 20px",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: 13,
            background: "#1f6feb",
            color: "#fff",
            border: "none",
            cursor: "pointer"
          }
        },
        "Submit"
      ))
    ), itemsList.map((item) => {
      const isPr = item.type === "pull_request";
      const badgeBg2 = isPr ? isDark ? "rgba(210,168,255,0.15)" : "#f3e8ff" : isDark ? "rgba(63,185,80,0.15)" : "#dcfce7";
      const badgeText2 = isPr ? isDark ? "#d2a8ff" : "#7c3aed" : isDark ? "#3fb950" : "#15803d";
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: item.id,
          style: {
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            borderRadius: 14,
            padding: "18px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 14,
            boxShadow: shadow
          }
        },
        /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 } }, /* @__PURE__ */ React.createElement("span", { style: {
          fontSize: 10,
          padding: "3px 8px",
          borderRadius: 12,
          fontWeight: 800,
          textTransform: "uppercase",
          background: badgeBg2,
          color: badgeText2
        } }, isPr ? "PR" : "Issue", " #", item.id), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 800, fontSize: 15, color: textMain } }, item.title), /* @__PURE__ */ React.createElement("span", { style: {
          fontSize: 10,
          padding: "2px 8px",
          borderRadius: 6,
          background: item.status === "open" ? isDark ? "rgba(63,185,80,0.1)" : "#dcfce7" : isDark ? "rgba(139,148,158,0.1)" : "#f6f8fa",
          color: item.status === "open" ? isDark ? "#3fb950" : "#15803d" : textMuted
        } }, item.status)), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 13, color: textMuted, margin: "4px 0 6px" } }, item.description), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 11, color: textMuted, margin: 0 } }, "By ", item.creator_email, " \u2022 ", item.created_at)),
        isOwnerOrAdmin && item.status === "open" && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, isPr && /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => handleUpdateItemStatus(item.id, "merged"),
            style: {
              padding: "6px 14px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              background: isDark ? "#3d1f6e" : "#f3e8ff",
              color: isDark ? "#d2a8ff" : "#7c3aed",
              border: `1px solid ${isDark ? "#6e40c9" : "#e9d5ff"}`,
              cursor: "pointer"
            }
          },
          "Merge"
        ), /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => handleUpdateItemStatus(item.id, "closed"),
            style: {
              padding: "6px 14px",
              borderRadius: 8,
              fontSize: 11,
              fontWeight: 700,
              background: isDark ? "#21262d" : "#f6f8fa",
              color: textMuted,
              border: `1px solid ${cardBorder}`,
              cursor: "pointer"
            }
          },
          "Close"
        ))
      );
    }), itemsList.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: 40, color: textMuted, background: cardBg, borderRadius: 14, border: `1px solid ${cardBorder}` } }, "No issues or PRs yet.")));
  }
  function AdminCockpitView({ user, onBack, showNotify, theme }) {
    const isDark = theme !== "light";
    const cardBg = isDark ? "#161b22" : "#ffffff";
    const cardBorder = isDark ? "#30363d" : "#d0d7de";
    const textMain = isDark ? "#e6edf3" : "#1f2328";
    const textMuted = isDark ? "#8b949e" : "#57606a";
    const inputBg = isDark ? "#0d1117" : "#ffffff";
    const innerBg = isDark ? "#0d1117" : "#f6f8fa";
    const shadow = isDark ? "0 8px 24px rgba(0,0,0,0.3)" : "0 1px 3px rgba(31, 35, 40, 0.08)";
    const [metrics, setMetrics] = useState(null);
    const [usersList, setUsersList] = useState([]);
    const [actionRequests, setActionRequests] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [activeTab, setActiveTab] = useState("metrics");
    const loadAll = async () => {
      try {
        const [m, u, r, l] = await Promise.all([
          apiCall("/admin/metrics"),
          apiCall("/admin/users"),
          apiCall("/admin/action-requests"),
          apiCall("/admin/audit-logs")
        ]);
        setMetrics(m.metrics);
        setUsersList(u.users || []);
        setActionRequests(r.requests || []);
        setAuditLogs(l.logs || []);
      } catch (err) {
        showNotify(err.message, "error");
      }
    };
    useEffect(() => {
      loadAll();
    }, []);
    const handleUpdateUserStatus = async (userId, newStatus) => {
      try {
        const r = await apiCall(`/admin/users/${userId}`, "PUT", { status: newStatus });
        showNotify(r.message);
        loadAll();
      } catch (err) {
        showNotify(err.message, "error");
      }
    };
    const handleUpdateUserRole = async (userId, newRole) => {
      try {
        const r = await apiCall(`/admin/users/${userId}`, "PUT", { role: newRole });
        showNotify(r.message);
        loadAll();
      } catch (err) {
        showNotify(err.message, "error");
      }
    };
    const handleProcessRequest = async (requestId, action) => {
      if (action === "approved" && !confirm("This will permanently delete the user and all their data. Proceed?")) return;
      try {
        const r = await apiCall(`/admin/action-requests/${requestId}/process`, "POST", { action });
        showNotify(r.message, action === "approved" ? "info" : "success");
        loadAll();
      } catch (err) {
        showNotify(err.message, "error");
      }
    };
    const tabs = [
      { key: "metrics", label: "\u{1F4CA} Platform Metrics" },
      { key: "users", label: `\u{1F465} User Management (${usersList.length})` },
      { key: "deletions", label: `\u{1F6A8} Purge Requests (${actionRequests.filter((r) => r.status === "pending").length})` },
      { key: "logs", label: `\u{1F4DC} Security Audit (${auditLogs.length})` }
    ];
    return /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 1100, margin: "0 auto", width: "100%", display: "flex", flexDirection: "column", gap: 22 } }, /* @__PURE__ */ React.createElement("div", { style: {
      background: isDark ? "linear-gradient(135deg, #1f1035, #161b22)" : "linear-gradient(135deg, #f5f0ff, #f0fdf4)",
      border: "1px solid " + (isDark ? "rgba(210,168,255,0.4)" : "#e9d5ff"),
      borderRadius: 16,
      padding: "24px 28px",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      boxShadow: shadow
    } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: onBack,
        style: {
          background: isDark ? "#21262d" : "#ffffff",
          border: `1px solid ${cardBorder}`,
          color: isDark ? "#d2a8ff" : "#7c3aed",
          padding: "6px 14px",
          borderRadius: 20,
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 10,
          boxShadow: isDark ? "none" : "0 1px 2px rgba(31,35,40,0.04)"
        }
      },
      "\u2190 Back to Dashboard"
    ), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 26 } }, "\u{1F6E1}\uFE0F"), /* @__PURE__ */ React.createElement("h1", { style: { fontWeight: 900, fontSize: 24, color: isDark ? "#d2a8ff" : "#7c3aed", margin: 0 } }, "Administrator Cockpit")), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 13, color: textMuted, margin: "6px 0 0" } }, "Manage users, account statuses, developer roles, account deletion requests, and real-time security audit telemetry."))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10, flexWrap: "wrap" } }, tabs.map((t) => {
      const active = activeTab === t.key;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: t.key,
          onClick: () => setActiveTab(t.key),
          style: {
            padding: "8px 18px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700,
            background: active ? isDark ? "#3d1f6e" : "#f3e8ff" : isDark ? "#21262d" : "#ffffff",
            color: active ? isDark ? "#d2a8ff" : "#7c3aed" : textMuted,
            border: active ? isDark ? "1px solid #6e40c9" : "1px solid #e9d5ff" : isDark ? "1px solid #30363d" : "1px solid #d0d7de",
            cursor: "pointer",
            boxShadow: isDark ? "none" : "0 1px 2px rgba(31,35,40,0.04)"
          }
        },
        t.label
      );
    })), activeTab === "metrics" && metrics && /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 } }, [
      { label: "Total Users", value: metrics.total_users, sub: `${metrics.active_users} active`, color: isDark ? "#58a6ff" : "#0969da" },
      { label: "Unverified", value: metrics.unverified_users, sub: "Need verification", color: isDark ? "#e3b341" : "#a16207" },
      { label: "Repositories", value: metrics.total_repositories, sub: `${metrics.public_repositories} public`, color: isDark ? "#3fb950" : "#15803d" },
      { label: "Total Commits", value: metrics.total_commits, sub: `${metrics.total_files} files`, color: isDark ? "#79c0ff" : "#0284c7" },
      { label: "Pending Purges", value: metrics.pending_deletions, sub: "Needs review", color: isDark ? "#f85149" : "#b91c1c" }
    ].map((s, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "22px 20px", boxShadow: shadow } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, fontWeight: 700 } }, s.label), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 28, fontWeight: 900, color: s.color } }, s.value), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: textMuted, marginTop: 4 } }, s.sub)))), activeTab === "users" && /* @__PURE__ */ React.createElement("div", { style: { background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, overflow: "hidden", boxShadow: shadow } }, /* @__PURE__ */ React.createElement("div", { style: { overflowX: "auto" } }, /* @__PURE__ */ React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: 12 } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { style: { background: innerBg, borderBottom: `2px solid ${cardBorder}` } }, ["User", "Role", "Status", "Verified", "Repos", "Actions"].map((h) => /* @__PURE__ */ React.createElement("th", { key: h, style: { padding: "12px 16px", textAlign: "left", fontWeight: 800, color: textMuted, textTransform: "uppercase", fontSize: 11, letterSpacing: 1 } }, h)))), /* @__PURE__ */ React.createElement("tbody", null, usersList.map((u) => /* @__PURE__ */ React.createElement("tr", { key: u.id, style: { borderBottom: `1px solid ${isDark ? "#21262d" : "#f0f2f5"}` } }, /* @__PURE__ */ React.createElement("td", { style: { padding: "14px 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, /* @__PURE__ */ React.createElement(UserAvatar, { user: u, size: 32 }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, color: textMain } }, u.full_name || u.email), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: isDark ? "#58a6ff" : "#0969da", fontFamily: "monospace" } }, u.username && `@${u.username} \u2022 `, u.email)))), /* @__PURE__ */ React.createElement("td", { style: { padding: "14px 16px" } }, /* @__PURE__ */ React.createElement(
      "select",
      {
        value: u.role_type,
        onChange: (e) => handleUpdateUserRole(u.id, e.target.value),
        style: {
          padding: "5px 10px",
          borderRadius: 8,
          border: `1px solid ${cardBorder}`,
          background: inputBg,
          color: u.role_type === "admin" ? isDark ? "#d2a8ff" : "#7c3aed" : isDark ? "#58a6ff" : "#0969da",
          fontSize: 11,
          fontWeight: 700
        }
      },
      /* @__PURE__ */ React.createElement("option", { value: "user" }, "user"),
      /* @__PURE__ */ React.createElement("option", { value: "admin" }, "admin")
    )), /* @__PURE__ */ React.createElement("td", { style: { padding: "14px 16px" } }, /* @__PURE__ */ React.createElement("span", { style: {
      fontSize: 11,
      padding: "3px 10px",
      borderRadius: 12,
      fontWeight: 800,
      background: u.account_status === "active" ? isDark ? "rgba(63,185,80,0.15)" : "#dcfce7" : isDark ? "rgba(248,81,73,0.15)" : "#fee2e2",
      color: u.account_status === "active" ? isDark ? "#3fb950" : "#15803d" : isDark ? "#f85149" : "#b91c1c"
    } }, u.account_status)), /* @__PURE__ */ React.createElement("td", { style: { padding: "14px 16px", color: u.email_verified_status ? "#3fb950" : "#e3b341" } }, u.email_verified_status ? "\u2705" : "\u23F3"), /* @__PURE__ */ React.createElement("td", { style: { padding: "14px 16px", fontFamily: "monospace", color: textMain } }, u.repo_count), /* @__PURE__ */ React.createElement("td", { style: { padding: "14px 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6 } }, u.account_status !== "suspended" ? /* @__PURE__ */ React.createElement("button", { onClick: () => handleUpdateUserStatus(u.id, "suspended"), style: { padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: isDark ? "rgba(227,179,65,0.15)" : "#fef9c3", color: isDark ? "#e3b341" : "#a16207", border: `1px solid ${isDark ? "rgba(227,179,65,0.3)" : "#fef08a"}`, cursor: "pointer" } }, "Suspend") : /* @__PURE__ */ React.createElement("button", { onClick: () => handleUpdateUserStatus(u.id, "active"), style: { padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: isDark ? "rgba(63,185,80,0.15)" : "#dcfce7", color: isDark ? "#3fb950" : "#15803d", border: `1px solid ${isDark ? "rgba(63,185,80,0.3)" : "#bbf7d0"}`, cursor: "pointer" } }, "Activate"), u.account_status !== "blocked" && /* @__PURE__ */ React.createElement("button", { onClick: () => handleUpdateUserStatus(u.id, "blocked"), style: { padding: "5px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: isDark ? "rgba(248,81,73,0.15)" : "#fee2e2", color: isDark ? "#f85149" : "#b91c1c", border: `1px solid ${isDark ? "rgba(248,81,73,0.3)" : "#fecaca"}`, cursor: "pointer" } }, "Block"))))))))), activeTab === "deletions" && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 12 } }, actionRequests.map((r) => /* @__PURE__ */ React.createElement("div", { key: r.id, style: { background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 14, padding: "18px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", boxShadow: shadow } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 800, color: "#f85149", marginBottom: 4, fontSize: 14 } }, r.user_email), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: textMuted } }, 'Reason: "', r.reason_text, '"'), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: textMuted, marginTop: 4 } }, "Submitted: ", r.created_at, " \u2022 Status: ", /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 700, color: r.status === "pending" ? "#e3b341" : r.status === "approved" ? "#f85149" : "#8b949e" } }, r.status))), r.status === "pending" && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8 } }, /* @__PURE__ */ React.createElement("button", { onClick: () => handleProcessRequest(r.id, "approved"), style: { padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: isDark ? "#3d0b0b" : "#fee2e2", color: isDark ? "#f85149" : "#b91c1c", border: `1px solid ${isDark ? "rgba(248,81,73,0.4)" : "#fecaca"}`, cursor: "pointer" } }, "Approve & Delete"), /* @__PURE__ */ React.createElement("button", { onClick: () => handleProcessRequest(r.id, "rejected"), style: { padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700, background: isDark ? "#21262d" : "#f6f8fa", color: textMuted, border: `1px solid ${cardBorder}`, cursor: "pointer" } }, "Reject")))), actionRequests.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: 40, color: textMuted, background: cardBg, borderRadius: 14, border: `1px solid ${cardBorder}` } }, "No deletion requests.")), activeTab === "logs" && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 8 } }, Array.isArray(auditLogs) && auditLogs.length > 0 ? auditLogs.map((l, i) => {
      const actionType = l && typeof l === "object" ? l.action_type || l.actionType || "" : String(l || "");
      const actorEmail = l && typeof l === "object" ? l.actor_email || l.actorEmail || "" : "";
      const timestamp = l && typeof l === "object" ? l.timestamp || l.created_at || "" : "";
      const description = l && typeof l === "object" ? typeof l.description === "string" ? l.description : JSON.stringify(l.description) : "";
      return /* @__PURE__ */ React.createElement("div", { key: i, style: { background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 10, padding: "12px 16px", fontSize: 12, boxShadow: shadow } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 4 } }, /* @__PURE__ */ React.createElement("span", { style: { padding: "2px 8px", borderRadius: 6, background: isDark ? "rgba(88,166,255,0.15)" : "#e0f2fe", color: isDark ? "#58a6ff" : "#0969da", fontSize: 10, fontWeight: 800 } }, actionType), /* @__PURE__ */ React.createElement("span", { style: { color: textMain, fontWeight: 600 } }, actorEmail), /* @__PURE__ */ React.createElement("span", { style: { color: textMuted, marginLeft: "auto", fontSize: 11 } }, timestamp)), /* @__PURE__ */ React.createElement("div", { style: { color: textMuted } }, description));
    }) : /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: 40, color: textMuted, background: cardBg, borderRadius: 14, border: `1px solid ${cardBorder}` } }, "No audit logs.")));
  }
  function DashboardView({
    user,
    repositories = [],
    onSelectRepo,
    onOpenCreateRepo,
    onOpenDeleteAccount,
    onOpenAdmin,
    onNavFeed,
    theme
  }) {
    const isDark = theme !== "light";
    const cardBg = isDark ? "#161b22" : "#ffffff";
    const cardBorder = isDark ? "#30363d" : "#d0d7de";
    const textMain = isDark ? "#e6edf3" : "#1f2328";
    const textMuted = isDark ? "#8b949e" : "#57606a";
    const inputBg = isDark ? "#0d1117" : "#ffffff";
    const innerBg = isDark ? "#0d1117" : "#f6f8fa";
    const shadow = isDark ? "0 8px 24px rgba(0,0,0,0.3)" : "0 1px 3px rgba(31, 35, 40, 0.08)";
    const [dashData, setDashData] = useState(user ? { user } : null);
    const [fetchError, setFetchError] = useState("");
    const [featuredJobs, setFeaturedJobs] = useState([]);
    const [jobsLoading, setJobsLoading] = useState(false);
    const userRepos = user && Array.isArray(repositories) ? repositories.filter((r) => r.user_id == user.id) : [];
    const isAdmin = user?.role === "admin";
    const profile = dashData?.user || user;
    useEffect(() => {
      if (!user) return;
      setDashData((prev) => prev && prev.user ? prev : { user });
      const endpoint = isAdmin ? "/admin/dashboard" : "/dashboard";
      apiCall(endpoint).then((d) => {
        setDashData(d);
        setFetchError("");
      }).catch(() => {
        setFetchError("Dashboard data could not be loaded yet. Showing saved profile info.");
      });
      if (!isAdmin) {
        setJobsLoading(true);
        apiCall("/jobs?status=open").then((res) => {
          setFeaturedJobs(res.jobs ? res.jobs.slice(0, 4) : []);
        }).catch(() => {
        }).finally(() => setJobsLoading(false));
      }
    }, [user, isAdmin]);
    if (!user) {
      return /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: 60 } }, /* @__PURE__ */ React.createElement("p", { style: { color: textMuted, fontSize: 16 } }, "Please sign in to access your dashboard."));
    }
    if (!dashData && !fetchError) {
      return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", gap: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { width: 44, height: 44, border: "3px solid rgba(88, 166, 255, 0.2)", borderTopColor: "#58a6ff", borderRadius: "50%", animation: "codehubSpin 0.75s linear infinite" } }), /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 700, fontSize: 15, color: textMain } }, "Loading dashboard data\u2026"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: textMuted } }, "Fetching real-time metrics and repository telemetry"));
    }
    const stats = dashData?.stats || {};
    const activity = dashData?.activity || dashData?.recent_logs || [];
    const recentRepos = dashData?.recent_repos || userRepos;
    const storageMB = ((stats.storage_bytes || 0) / (1024 * 1024)).toFixed(2);
    return /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 24, maxWidth: 1200, margin: "0 auto", width: "100%" } }, /* @__PURE__ */ React.createElement("div", { style: {
      background: isDark ? isAdmin ? "linear-gradient(135deg, #1f1035, #161b22)" : "linear-gradient(135deg, #0d1f47 0%, #161240 50%, #1a0d40 100%)" : isAdmin ? "linear-gradient(135deg, #f5f0ff, #f0fdf4)" : "linear-gradient(135deg, #e0f2fe, #f0fdf4)",
      border: "1px solid " + (isAdmin ? isDark ? "#6e40c9" : "#e9d5ff" : isDark ? "#1f4280" : "#bae6fd"),
      borderRadius: 20,
      padding: "30px 34px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 20,
      boxShadow: shadow
    } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 20 } }, /* @__PURE__ */ React.createElement(UserAvatar, { user: profile || user, size: 64 }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("h1", { style: { fontWeight: 900, fontSize: 24, color: textMain, margin: 0 } }, "Good ", (/* @__PURE__ */ new Date()).getHours() < 12 ? "morning" : (/* @__PURE__ */ new Date()).getHours() < 18 ? "afternoon" : "evening", ", ", profile?.full_name || profile?.username || profile?.email || user?.full_name || user?.username || user?.email, "! \u{1F44B}"), /* @__PURE__ */ React.createElement("span", { style: {
      fontSize: 11,
      padding: "3px 10px",
      borderRadius: 20,
      fontWeight: 800,
      background: isAdmin ? isDark ? "rgba(210,168,255,0.2)" : "#f3e8ff" : isDark ? "rgba(88,166,255,0.2)" : "#e0f2fe",
      color: isAdmin ? isDark ? "#d2a8ff" : "#7c3aed" : isDark ? "#79c0ff" : "#0284c7",
      border: `1px solid ${isAdmin ? isDark ? "rgba(210,168,255,0.4)" : "#e9d5ff" : isDark ? "rgba(88,166,255,0.4)" : "#bae6fd"}`
    } }, isAdmin ? "ADMINISTRATOR" : "DEVELOPER"), user.is_verified && /* @__PURE__ */ React.createElement("span", { style: {
      fontSize: 11,
      padding: "3px 10px",
      borderRadius: 20,
      fontWeight: 700,
      background: isDark ? "rgba(63,185,80,0.15)" : "#dcfce7",
      color: isDark ? "#3fb950" : "#15803d",
      border: `1px solid ${isDark ? "rgba(63,185,80,0.3)" : "#bbf7d0"}`
    } }, "\u2705 Verified")), /* @__PURE__ */ React.createElement("p", { style: { color: textMuted, fontSize: 13, margin: 0 } }, isAdmin ? "System Administrator Portal \u2014 Platform Management, User Moderation & Security Logs" : "Welcome to your active CodeHub developer environment. Everything is up to date."))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 12, flexWrap: "wrap" } }, !isAdmin && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: onOpenCreateRepo,
        disabled: !user.is_verified,
        style: {
          padding: "11px 22px",
          borderRadius: 14,
          fontWeight: 800,
          fontSize: 13,
          background: user.is_verified ? "linear-gradient(135deg, #238636, #2ea043)" : isDark ? "#21262d" : "#e2e8f0",
          color: user.is_verified ? "#fff" : textMuted,
          cursor: user.is_verified ? "pointer" : "not-allowed",
          border: "none",
          boxShadow: user.is_verified ? "0 4px 16px rgba(35,134,54,0.35)" : "none"
        }
      },
      "+ New Repository"
    ), isAdmin && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: onOpenAdmin,
        style: {
          padding: "11px 22px",
          borderRadius: 14,
          fontWeight: 800,
          fontSize: 13,
          background: isDark ? "linear-gradient(135deg, #3d1f6e, #532b9b)" : "linear-gradient(135deg, #7c3aed, #6d28d9)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(110,64,201,0.35)"
        }
      },
      "\u{1F6E1}\uFE0F Open Admin Cockpit"
    ))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 } }, (isAdmin ? [
      { label: "Total Users", value: stats.total_users ?? 0, icon: "\u{1F465}", color: isDark ? "#58a6ff" : "#0969da", sub: `${stats.active_users ?? 0} active` },
      { label: "Total Repositories", value: stats.total_repositories ?? 0, icon: "\u{1F4C1}", color: isDark ? "#3fb950" : "#15803d", sub: `${stats.public_repositories ?? 0} public` },
      { label: "Total Commits", value: stats.total_commits ?? 0, icon: "\u{1F4E6}", color: isDark ? "#79c0ff" : "#0284c7", sub: `${stats.total_files ?? 0} files` },
      { label: "Community Posts", value: stats.total_feed_posts ?? 0, icon: "\u{1F4F0}", color: isDark ? "#d2a8ff" : "#7c3aed", sub: "Active stream" },
      { label: "Pending Purges", value: stats.pending_deletions ?? 0, icon: "\u{1F6A8}", color: isDark ? "#f85149" : "#b91c1c", sub: "Review needed" },
      { label: "System Access", value: "Overriding", icon: "\u26A1", color: isDark ? "#e3b341" : "#a16207", sub: "Full privilege" }
    ] : [
      { label: "Repositories", value: stats.repositories ?? userRepos.length, icon: "\u{1F4C1}", color: isDark ? "#58a6ff" : "#0969da", sub: "Hosted projects" },
      { label: "Total Commits", value: stats.commits ?? 0, icon: "\u{1F4E6}", color: isDark ? "#3fb950" : "#15803d", sub: "Pushed versions" },
      { label: "Issues & PRs", value: (stats.issues ?? 0) + (stats.pull_requests ?? 0), icon: "\u{1F500}", color: isDark ? "#d2a8ff" : "#7c3aed", sub: `${stats.pull_requests ?? 0} PRs, ${stats.issues ?? 0} issues` },
      { label: "Community Feed", value: stats.feed_posts ?? 0, icon: "\u{1F4F0}", color: isDark ? "#79c0ff" : "#0284c7", sub: `${stats.likes_received ?? 0} likes received` },
      { label: "Drive Storage", value: `${storageMB} MB`, icon: "\u2601\uFE0F", color: isDark ? "#e3b341" : "#a16207", sub: `${stats.files_stored ?? 0} files synced` },
      { label: "Account Tier", value: user.role?.toUpperCase(), icon: "\u{1F464}", color: isDark ? "#58a6ff" : "#0969da", sub: user.is_verified ? "Verified access" : "Unverified" }
    ]).map((s, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "20px 18px", display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: shadow } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 24 } }, s.icon), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: textMuted, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 } }, s.label)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 24, fontWeight: 900, color: s.color } }, s.value), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: textMuted, marginTop: 4 } }, s.sub))))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 } }, /* @__PURE__ */ React.createElement("div", { style: { background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 14, boxShadow: shadow } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("h3", { style: { fontWeight: 800, fontSize: 15, color: textMain, margin: 0 } }, "\u{1F464} Developer Identity"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => window.dispatchEvent(new CustomEvent("navTo", { detail: "settings" })),
        style: { background: "none", border: "none", color: isDark ? "#58a6ff" : "#0969da", fontSize: 12, cursor: "pointer", fontWeight: 700 }
      },
      "Edit Profile \u2192"
    )), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: textMuted, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 } }, "Username"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 700, color: isDark ? "#58a6ff" : "#0969da", fontFamily: "monospace" } }, "@", profile?.username || "not_set")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: textMuted, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 } }, "Organization"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: textMain } }, profile?.organization || "Independent")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: textMuted, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 } }, "Location"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: textMain } }, profile?.location || "Remote / Worldwide")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: textMuted, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 } }, "Website"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, fontWeight: 600, color: isDark ? "#58a6ff" : "#0969da", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, profile?.website_url ? /* @__PURE__ */ React.createElement("a", { href: profile.website_url, target: "_blank", rel: "noreferrer", style: { color: isDark ? "#58a6ff" : "#0969da", textDecoration: "none" } }, profile.website_url.replace(/^https?:\/\//, "")) : "\u2014"))), profile?.bio && /* @__PURE__ */ React.createElement("div", { style: { background: innerBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: "10px 14px", fontSize: 12, color: textMuted, lineHeight: 1.5 } }, '"', profile.bio, '"')), /* @__PURE__ */ React.createElement("div", { style: { background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "22px 24px", display: "flex", flexDirection: "column", gap: 14, boxShadow: shadow } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } }, /* @__PURE__ */ React.createElement("h3", { style: { fontWeight: 800, fontSize: 15, color: textMain, margin: 0 } }, "\u2601\uFE0F Cloud Drive Sync & Health"), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, padding: "2px 8px", borderRadius: 12, background: isDark ? "rgba(63,185,80,0.15)" : "#dcfce7", color: isDark ? "#3fb950" : "#15803d", fontWeight: 700 } }, "Connected")), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12, color: textMuted, margin: 0, lineHeight: 1.5 } }, "Automated Google Drive version sync active. All commits create real-time snapshot files in isolated repository cloud folders."), /* @__PURE__ */ React.createElement("div", { style: { background: innerBg, border: `1px solid ${cardBorder}`, borderRadius: 12, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 } }, /* @__PURE__ */ React.createElement("span", { style: { color: textMuted } }, "Storage Used"), /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 800, color: isDark ? "#58a6ff" : "#0969da" } }, storageMB, " MB / 15 GB Free Quota")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 10 } }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => window.dispatchEvent(new CustomEvent("navTo", { detail: "ai" })),
        style: { flex: 1, padding: "8px 14px", borderRadius: 12, fontSize: 12, fontWeight: 700, background: "linear-gradient(135deg,#1f6feb,#388bfd)", color: "#fff", border: "none", cursor: "pointer" }
      },
      "\u2728 Ask AI Review"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: onNavFeed,
        style: { flex: 1, padding: "8px 14px", borderRadius: 12, fontSize: 12, fontWeight: 700, background: isDark ? "#21262d" : "#f6f8fa", color: isDark ? "#58a6ff" : "#0969da", border: `1px solid ${cardBorder}`, cursor: "pointer" }
      },
      "\u{1F4F0} Feed Updates"
    )))), /* @__PURE__ */ React.createElement("div", { style: { background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "22px 24px", boxShadow: shadow } }, /* @__PURE__ */ React.createElement("h3", { style: { fontWeight: 800, fontSize: 15, marginBottom: 16, color: textMain } }, "\u26A1 Developer Quick Launch"), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 } }, [
      { icon: "\u{1F4BC}", label: isAdmin ? "Manage Jobs" : "Explore Jobs", action: () => window.dispatchEvent(new CustomEvent("navTo", { detail: "jobs" })) },
      { icon: "\u{1F4F0}", label: "Community Feed", action: onNavFeed },
      { icon: "\u2728", label: "Ask AI Copilot", action: () => window.dispatchEvent(new CustomEvent("navTo", { detail: "ai" })) },
      ...!isAdmin ? [
        { icon: "\u{1F4C1}", label: "New Repository", action: onOpenCreateRepo },
        { icon: "\u{1F500}", label: "View Repos", action: () => window.dispatchEvent(new CustomEvent("navTo", { detail: "repos" })) }
      ] : [],
      { icon: "\u2699\uFE0F", label: "Settings", action: () => window.dispatchEvent(new CustomEvent("navTo", { detail: "settings" })) },
      ...!isAdmin && user.account_status !== "deletion_pending" ? [{ icon: "\u{1F5D1}\uFE0F", label: "Delete Account", action: onOpenDeleteAccount }] : [],
      ...isAdmin ? [{ icon: "\u{1F6E1}\uFE0F", label: "Admin Cockpit", action: onOpenAdmin }] : []
    ].map((qa, i) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: i,
        onClick: qa.action,
        style: {
          padding: "14px 10px",
          borderRadius: 14,
          background: innerBg,
          border: `1px solid ${cardBorder}`,
          color: textMain,
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          transition: "all 0.2s",
          boxShadow: isDark ? "none" : "0 1px 2px rgba(31,35,40,0.04)"
        },
        onMouseEnter: (e) => {
          e.currentTarget.style.borderColor = "#0969da";
          e.currentTarget.style.transform = "translateY(-2px)";
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.borderColor = cardBorder;
          e.currentTarget.style.transform = "translateY(0)";
        }
      },
      /* @__PURE__ */ React.createElement("span", { style: { fontSize: 22 } }, qa.icon),
      qa.label
    )))), !isAdmin && /* @__PURE__ */ React.createElement("div", { style: { background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "22px 24px", boxShadow: shadow } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { style: { fontWeight: 800, fontSize: 16, color: textMain, margin: 0 } }, "\u{1F4BC} Recommended Tech Jobs & Career Opportunities"), /* @__PURE__ */ React.createElement("p", { style: { margin: "4px 0 0", fontSize: 12, color: textMuted } }, "Active open positions curated across engineering disciplines. Click to view full details and apply.")), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => window.dispatchEvent(new CustomEvent("navTo", { detail: "jobs" })),
        style: {
          padding: "8px 16px",
          borderRadius: 20,
          background: isDark ? "#21262d" : "#e0f2fe",
          border: `1px solid ${isDark ? "#30363d" : "#bae6fd"}`,
          color: isDark ? "#58a6ff" : "#0969da",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer"
        }
      },
      "Explore All Jobs \u2192"
    )), jobsLoading ? /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: 24, color: textMuted, fontSize: 13 } }, "Loading opportunities...") : featuredJobs.length === 0 ? /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: 24, color: textMuted, fontSize: 13, background: innerBg, borderRadius: 12, border: `1px solid ${cardBorder}` } }, "No open job postings available right now. Check back soon!") : /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 } }, featuredJobs.map((job) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: job.id,
        onClick: () => window.dispatchEvent(new CustomEvent("navTo", { detail: "jobs" })),
        style: {
          background: innerBg,
          border: `1px solid ${cardBorder}`,
          borderRadius: 14,
          padding: 16,
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: 12,
          transition: "all 0.2s",
          boxShadow: isDark ? "none" : "0 1px 2px rgba(31,35,40,0.04)"
        },
        onMouseEnter: (e) => {
          e.currentTarget.style.borderColor = "#0969da";
          e.currentTarget.style.transform = "translateY(-2px)";
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.borderColor = cardBorder;
          e.currentTarget.style.transform = "translateY(0)";
        }
      },
      /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 800, fontSize: 14, color: textMain } }, job.title), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, padding: "2px 8px", borderRadius: 10, background: isDark ? "rgba(63,185,80,0.15)" : "#dcfce7", color: isDark ? "#3fb950" : "#15803d", fontWeight: 700, textTransform: "uppercase" } }, job.job_type)), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: isDark ? "#58a6ff" : "#0969da", marginTop: 4 } }, "\u{1F3E2} ", job.company), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: textMuted, marginTop: 2 } }, "\u{1F4CD} ", job.location, " \xB7 \u{1F4B0} ", job.salary_range)),
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${isDark ? "#21262d" : "#e2e8f0"}`, paddingTop: 10 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, color: textMuted } }, job.skills && job.skills.slice(0, 2).join(" \xB7 ")), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12, color: isDark ? "#58a6ff" : "#0969da", fontWeight: 700 } }, "Apply Now \u2192"))
    )))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 } }, isAdmin ? /* @__PURE__ */ React.createElement("div", { style: { background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "22px 24px", boxShadow: shadow } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 } }, /* @__PURE__ */ React.createElement("h3", { style: { fontWeight: 800, fontSize: 15, color: textMain, margin: 0 } }, "\u{1F4F0} Community Feed Moderation"), /* @__PURE__ */ React.createElement("button", { onClick: onNavFeed, style: { background: "none", border: "none", color: isDark ? "#58a6ff" : "#0969da", fontSize: 12, cursor: "pointer", fontWeight: 700 } }, "Open Feed \u2192")), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 13, color: textMuted, lineHeight: 1.5, marginBottom: 16 } }, "Review technical updates and snippets shared across the developer ecosystem. Administrators have overriding deletion and moderation authority."), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: onNavFeed,
        style: { padding: "9px 18px", borderRadius: 12, background: isDark ? "#21262d" : "#f6f8fa", border: `1px solid ${cardBorder}`, color: isDark ? "#58a6ff" : "#0969da", fontSize: 12, fontWeight: 700, cursor: "pointer" }
      },
      "View Community Stream"
    )) : /* @__PURE__ */ React.createElement("div", { style: { background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "22px 24px", boxShadow: shadow } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 } }, /* @__PURE__ */ React.createElement("h3", { style: { fontWeight: 800, fontSize: 15, marginBottom: 0, color: textMain } }, "\u{1F4C1} Active Repositories"), user.is_verified && /* @__PURE__ */ React.createElement("button", { onClick: onOpenCreateRepo, style: { background: "none", border: "none", color: isDark ? "#58a6ff" : "#0969da", fontSize: 12, cursor: "pointer", fontWeight: 700 } }, "+ New")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } }, recentRepos.slice(0, 5).map((r) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: r.id,
        onClick: () => onSelectRepo(r.id),
        style: {
          padding: "12px 14px",
          borderRadius: 12,
          cursor: "pointer",
          border: `1px solid ${cardBorder}`,
          background: innerBg,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          transition: "all 0.2s",
          boxShadow: isDark ? "none" : "0 1px 2px rgba(31,35,40,0.04)"
        },
        onMouseEnter: (e) => {
          e.currentTarget.style.borderColor = "#0969da";
          e.currentTarget.style.transform = "translateY(-1px)";
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.borderColor = cardBorder;
          e.currentTarget.style.transform = "translateY(0)";
        }
      },
      /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 800, fontSize: 13, color: isDark ? "#58a6ff" : "#0969da" } }, "\u{1F4E6} ", r.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11, color: textMuted, marginTop: 3 } }, r.description || "No description provided")),
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, fontSize: 11, color: textMuted } }, /* @__PURE__ */ React.createElement("span", null, "\u{1F33F} ", r.branch_count || 1), /* @__PURE__ */ React.createElement("span", null, "\u{1F4E6} ", r.commit_count || 1))
    )), recentRepos.length === 0 && /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center", padding: 30, color: textMuted, fontSize: 13 } }, "No repositories yet. Create your first code workspace!"))), /* @__PURE__ */ React.createElement("div", { style: { background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 16, padding: "22px 24px", boxShadow: shadow } }, /* @__PURE__ */ React.createElement("h3", { style: { fontWeight: 800, fontSize: 15, color: textMain, marginBottom: 14 } }, "\u{1F4CA} Recent Activity Stream"), activity.length === 0 ? /* @__PURE__ */ React.createElement("p", { style: { color: textMuted, fontSize: 13 } }, "No recent activity recorded.") : /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: 10 } }, activity.slice(0, 7).map((a, i) => {
      const actionType = a && typeof a === "object" ? a.action_type || a.actionType || "" : String(a || "");
      const timestamp = a && typeof a === "object" ? a.timestamp || a.created_at || "" : "";
      const description = a && typeof a === "object" ? typeof a.description === "string" ? a.description : JSON.stringify(a.description) : String(a || "");
      return /* @__PURE__ */ React.createElement("div", { key: i, style: { padding: "10px 14px", background: innerBg, border: `1px solid ${cardBorder}`, borderRadius: 10, fontSize: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 3 } }, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 10, background: isDark ? "rgba(88,166,255,0.15)" : "#e0f2fe", color: isDark ? "#58a6ff" : "#0969da" } }, actionType || "EVENT"), /* @__PURE__ */ React.createElement("span", { style: { marginLeft: "auto", color: textMuted, fontSize: 11 } }, timestamp)), /* @__PURE__ */ React.createElement("div", { style: { color: textMain, lineHeight: 1.4 } }, description));
    })))));
  }
  var root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(/* @__PURE__ */ React.createElement(App, null));
})();
