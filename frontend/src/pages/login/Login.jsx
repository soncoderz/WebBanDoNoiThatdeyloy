import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { clearStoredSession, saveStoredSession } from "../../utils/storefront";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const loginInitialState = {
  emailOrUsername: "",
  password: "",
};

const registerInitialState = {
  username: "",
  email: "",
  password: "",
  fullName: "",
  phone: "",
};

const otpInitialState = {
  code: "",
};

function inputClassName() {
  return "w-full rounded-2xl border border-[#d8c4ae] bg-white/85 px-4 py-4 text-[#2f241f] outline-none transition focus:border-[#8c5f3f] focus:shadow-[0_0_0_4px_rgba(140,95,63,0.12)]";
}

function Login() {
  const navigate = useNavigate();
  const googleButtonRef = useRef(null);
  const [mode, setMode] = useState("login");
  const [loginForm, setLoginForm] = useState(loginInitialState);
  const [registerForm, setRegisterForm] = useState(registerInitialState);
  const [otpForm, setOtpForm] = useState(otpInitialState);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleButtonReady, setGoogleButtonReady] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [session, setSession] = useState(null);
  const [googleChallenge, setGoogleChallenge] = useState(null);
  const [googleCredential, setGoogleCredential] = useState("");

  function resetGoogleFlow(nextMode = "login") {
    setMode(nextMode);
    setGoogleChallenge(null);
    setGoogleCredential("");
    setOtpForm(otpInitialState);
  }

  async function handleLogin(event) {
    event.preventDefault();
    setLoading(true);
    setFeedback("");

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/api/auth/login`,
        loginForm,
      );
      setSession(data);
      setFeedback("Dang nhap thanh cong! Chao mung ban quay tro lai.");
      saveStoredSession(data);
      setLoginForm(loginInitialState);
      resetGoogleFlow("login");
      navigate("/");
    } catch (error) {
      setFeedback(
        error.response?.data?.message ||
          "Dang nhap that bai. Vui long kiem tra lai.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setLoading(true);
    setFeedback("");

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/api/auth/register`,
        registerForm,
      );
      setSession(data);
      setFeedback("Dang ky thanh cong! Hay bat dau mua sam ngay.");
      saveStoredSession(data);
      setRegisterForm(registerInitialState);
      resetGoogleFlow("login");
    } catch (error) {
      setFeedback(
        error.response?.data?.message ||
          "Dang ky that bai. Email hoac username co the da ton tai.",
      );
    } finally {
      setLoading(false);
    }
  }

  function updateForm(setter, field, value) {
    setter((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  async function requestGoogleOtp(credential, successMessage) {
    setGoogleLoading(true);
    setFeedback("");

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/api/auth/google/request-otp`,
        { credential },
      );

      setGoogleCredential(credential);
      setGoogleChallenge(data);
      setOtpForm(otpInitialState);
      setMode("otp");
      setFeedback(successMessage || data.message);
    } catch (error) {
      setFeedback(
        error.response?.data?.message ||
          "Khong the gui OTP tu dang nhap Google.",
      );
    } finally {
      setGoogleLoading(false);
    }
  }

  const handleGoogleCredential = useEffectEvent(async (response) => {
    if (!response?.credential) {
      setFeedback("Khong nhan duoc thong tin dang nhap Google.");
      return;
    }

    await requestGoogleOtp(response.credential);
  });

  useEffect(() => {
    if (mode !== "login") {
      return undefined;
    }

    if (!GOOGLE_CLIENT_ID || !googleButtonRef.current) {
      return undefined;
    }

    let isMounted = true;
    let scriptNode = null;
    setGoogleButtonReady(false);

    function renderGoogleButton() {
      if (
        !isMounted ||
        !window.google?.accounts?.id ||
        !googleButtonRef.current
      ) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
      });

      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "signin_with",
        width: 360,
      });
      setGoogleButtonReady(true);
    }

    if (window.google?.accounts?.id) {
      renderGoogleButton();
    } else {
      scriptNode = document.querySelector(
        'script[src="https://accounts.google.com/gsi/client"]',
      );

      if (!scriptNode) {
        scriptNode = document.createElement("script");
        scriptNode.src = "https://accounts.google.com/gsi/client";
        scriptNode.async = true;
        scriptNode.defer = true;
        document.head.appendChild(scriptNode);
      }

      scriptNode.addEventListener("load", renderGoogleButton);
    }

    return () => {
      isMounted = false;

      if (scriptNode) {
        scriptNode.removeEventListener("load", renderGoogleButton);
      }
    };
  }, [mode]);

  async function handleVerifyOtp(event) {
    event.preventDefault();

    if (!googleChallenge?.challengeId) {
      setFeedback("Phien dang nhap Google da het. Vui long thu lai.");
      resetGoogleFlow("login");
      return;
    }

    setLoading(true);
    setFeedback("");

    try {
      const { data } = await axios.post(
        `${API_BASE_URL}/api/auth/google/verify-otp`,
        {
          challengeId: googleChallenge.challengeId,
          otp: otpForm.code,
        },
      );

      setSession(data);
      setFeedback("Dang nhap Google thanh cong.");
      saveStoredSession(data);
      resetGoogleFlow("login");
      navigate("/");
    } catch (error) {
      setFeedback(
        error.response?.data?.message || "Khong the xac minh OTP.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    if (!googleCredential) {
      setFeedback("Khong con du lieu dang nhap Google. Vui long thu lai.");
      resetGoogleFlow("login");
      return;
    }

    await requestGoogleOtp(googleCredential, "Da gui lai OTP moi.");
  }

  function handleLogout() {
    clearStoredSession();
    setSession(null);
    resetGoogleFlow("login");
    setFeedback("Ban da dang xuat.");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(250,192,106,0.35),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(161,98,7,0.12),transparent_28%),linear-gradient(135deg,#f6efe4_0%,#efe4d3_40%,#f9f5ee_100%)] px-5 py-6 text-[#2f241f] md:px-8 md:py-12">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <section className="flex flex-col justify-center rounded-[28px] p-6 md:p-12">
          <p className="mb-4 text-xs font-semibold tracking-[0.22em] text-[#8c5f3f] uppercase">
            Tiem Do Trang Tri Noi That
          </p>
          <h1 className="max-w-[12ch] text-5xl leading-none font-semibold md:text-7xl">
            Kien tao khong gian song mo uoc cua ban.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[#5d483f]">
            Dang nhap de kham pha bo suu tap do decor doc dao, tu den trang tri,
            tranh treo tuong den nhung vat pham thu cong tinh te cho can phong
            cua ban.
          </p>

          <div className="mt-8 grid gap-4">
            <div className="rounded-[18px] border border-[rgba(129,95,66,0.15)] bg-white/55 px-5 py-4">
              <strong className="block">San pham doc ban</strong>
              <span className="mt-1 block text-[#6a544a]">
                Do trang tri duoc tuyen chon ky luong, mang phong cach rieng.
              </span>
            </div>
            <div className="rounded-[18px] border border-[rgba(129,95,66,0.15)] bg-white/55 px-5 py-4">
              <strong className="block">Giao hang tan tam</strong>
              <span className="mt-1 block text-[#6a544a]">
                Dam bao an toan cho moi mon do de vo nhat cua ban.
              </span>
            </div>
            <div className="rounded-[18px] border border-[rgba(129,95,66,0.15)] bg-white/55 px-5 py-4">
              <strong className="block">Uu dai thanh vien</strong>
              <span className="mt-1 block text-[#6a544a]">
                Nhan thong bao som nhat ve cac bo suu tap gioi han.
              </span>
            </div>
          </div>
        </section>

        <section className="w-full self-center rounded-[28px] border border-[rgba(129,95,66,0.18)] bg-[rgba(255,252,247,0.78)] p-5 shadow-[0_24px_80px_rgba(76,51,36,0.12)] backdrop-blur md:max-w-[32rem]">
          <div className="grid grid-cols-2 gap-2 rounded-full bg-[#f2e7d7] p-1.5">
            <button
              type="button"
              className={`rounded-full px-4 py-4 font-bold transition ${
                mode === "login" || mode === "otp"
                  ? "bg-[#2f241f] text-[#fff8f2]"
                  : "bg-transparent text-[#7a5b47] hover:-translate-y-0.5"
              }`}
              onClick={() => resetGoogleFlow("login")}
            >
              Dang nhap
            </button>
            <button
              type="button"
              className={`rounded-full px-4 py-4 font-bold transition ${
                mode === "register"
                  ? "bg-[#2f241f] text-[#fff8f2]"
                  : "bg-transparent text-[#7a5b47] hover:-translate-y-0.5"
              }`}
              onClick={() => resetGoogleFlow("register")}
            >
              Dang ky
            </button>
          </div>

          {mode === "login" ? (
            <form className="mt-6 grid gap-4" onSubmit={handleLogin}>
              <label className="grid gap-2 text-sm font-semibold text-[#5f493d]">
                Email hoac ten dang nhap
                <input
                  className={inputClassName()}
                  value={loginForm.emailOrUsername}
                  onChange={(event) =>
                    updateForm(
                      setLoginForm,
                      "emailOrUsername",
                      event.target.value,
                    )
                  }
                  placeholder="Nhap email hoac username"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[#5f493d]">
                Mat khau
                <input
                  className={inputClassName()}
                  type="password"
                  value={loginForm.password}
                  onChange={(event) =>
                    updateForm(setLoginForm, "password", event.target.value)
                  }
                  placeholder="Nhap mat khau"
                  required
                />
              </label>
              <button
                className="mt-2 rounded-2xl bg-[linear-gradient(135deg,#8c5f3f,#d87b38)] px-4 py-4 font-bold text-[#fffaf4] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70"
                type="submit"
                disabled={loading}
              >
                {loading ? "Dang xu ly..." : "Dang nhap ngay"}
              </button>

              <div className="mt-2 flex items-center gap-3 text-sm text-[#866b5b]">
                <span className="h-px flex-1 bg-[rgba(129,95,66,0.18)]" />
                <span>hoac tiep tuc voi Google</span>
                <span className="h-px flex-1 bg-[rgba(129,95,66,0.18)]" />
              </div>

              {GOOGLE_CLIENT_ID ? (
                <div className="mt-1 rounded-[22px] border border-[rgba(129,95,66,0.12)] bg-[#fffaf5] p-4">
                  <div
                    ref={googleButtonRef}
                    className="flex min-h-[44px] items-center justify-center"
                  />
                  {!googleButtonReady ? (
                    <p className="mt-3 text-center text-sm text-[#7a5b47]">
                      Dang tai Google Sign-In...
                    </p>
                  ) : null}
                  {googleLoading ? (
                    <p className="mt-3 text-center text-sm text-[#7a5b47]">
                      Dang gui OTP den email cua ban...
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="rounded-2xl bg-[#fff6ea] px-4 py-3 text-sm text-[#734d36]">
                  Chua tim thay `VITE_GOOGLE_CLIENT_ID` de hien thi dang nhap
                  Google.
                </p>
              )}
            </form>
          ) : mode === "otp" ? (
            <form className="mt-6 grid gap-4" onSubmit={handleVerifyOtp}>
              <div className="rounded-[20px] border border-[rgba(129,95,66,0.15)] bg-[#fff6ea] p-5">
                <h2 className="text-2xl font-semibold text-[#2f241f]">
                  Nhap ma OTP
                </h2>
                <p className="mt-3 text-sm leading-7 text-[#6a544a]">
                  Chung toi da gui ma xac minh toi{" "}
                  <strong>{googleChallenge?.email || "email cua ban"}</strong>.
                  Ban chi dang nhap thanh cong sau khi OTP dung.
                </p>
              </div>

              <label className="grid gap-2 text-sm font-semibold text-[#5f493d]">
                Ma OTP
                <input
                  className={inputClassName()}
                  inputMode="numeric"
                  maxLength={6}
                  value={otpForm.code}
                  onChange={(event) =>
                    updateForm(
                      setOtpForm,
                      "code",
                      event.target.value.replace(/\D/g, ""),
                    )
                  }
                  placeholder="Nhap ma OTP gom 6 chu so"
                  required
                />
              </label>

              <button
                className="mt-2 rounded-2xl bg-[linear-gradient(135deg,#8c5f3f,#d87b38)] px-4 py-4 font-bold text-[#fffaf4] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70"
                type="submit"
                disabled={loading}
              >
                {loading ? "Dang xac minh..." : "Xac minh va dang nhap"}
              </button>

              <button
                type="button"
                className="rounded-2xl border border-[#d8c4ae] bg-white/80 px-4 py-4 font-bold text-[#6a544a] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleResendOtp}
                disabled={googleLoading}
              >
                {googleLoading ? "Dang gui lai OTP..." : "Gui lai OTP"}
              </button>
            </form>
          ) : (
            <form className="mt-6 grid gap-4" onSubmit={handleRegister}>
              <label className="grid gap-2 text-sm font-semibold text-[#5f493d]">
                Ten nguoi dung
                <input
                  className={inputClassName()}
                  value={registerForm.username}
                  onChange={(event) =>
                    updateForm(setRegisterForm, "username", event.target.value)
                  }
                  placeholder="Username"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[#5f493d]">
                Email
                <input
                  className={inputClassName()}
                  type="email"
                  value={registerForm.email}
                  onChange={(event) =>
                    updateForm(setRegisterForm, "email", event.target.value)
                  }
                  placeholder="Dia chi email cua ban"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[#5f493d]">
                Mat khau
                <input
                  className={inputClassName()}
                  type="password"
                  value={registerForm.password}
                  onChange={(event) =>
                    updateForm(setRegisterForm, "password", event.target.value)
                  }
                  placeholder="Mat khau toi thieu 6 ky tu"
                  required
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[#5f493d]">
                Ho va ten
                <input
                  className={inputClassName()}
                  value={registerForm.fullName}
                  onChange={(event) =>
                    updateForm(setRegisterForm, "fullName", event.target.value)
                  }
                  placeholder="Ho ten day du"
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold text-[#5f493d]">
                So dien thoai
                <input
                  className={inputClassName()}
                  value={registerForm.phone}
                  onChange={(event) =>
                    updateForm(setRegisterForm, "phone", event.target.value)
                  }
                  placeholder="So dien thoai lien he"
                />
              </label>
              <button
                className="mt-2 rounded-2xl bg-[linear-gradient(135deg,#8c5f3f,#d87b38)] px-4 py-4 font-bold text-[#fffaf4] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70"
                type="submit"
                disabled={loading}
              >
                {loading ? "Dang xu ly..." : "Tham gia ngay"}
              </button>
            </form>
          )}

          {feedback ? (
            <p className="mt-4 rounded-2xl bg-[#f5ebde] px-4 py-3 text-[#734d36]">
              {feedback}
            </p>
          ) : null}

          {session?.user ? (
            <div className="mt-4 rounded-[20px] border border-[rgba(129,95,66,0.15)] bg-[#fff6ea] p-5">
              <h2 className="text-2xl font-semibold">
                Chao mung, {session.user.username}!
              </h2>
              <p className="mt-3">
                Cam on ban da ghe tham{" "}
                <strong>Tiem Do Trang Tri Noi That</strong>.
              </p>
              <p className="mt-2">
                Hay bat dau lam moi khong gian cua ban ngay hom nay.
              </p>
              <button
                type="button"
                className="mt-4 rounded-2xl bg-[#f3e5d7] px-4 py-4 font-bold text-[#5a4336] transition hover:-translate-y-0.5"
                onClick={handleLogout}
              >
                Dang xuat
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export default Login;
